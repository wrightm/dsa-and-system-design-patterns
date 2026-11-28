package learn.ds.hashmap;

import java.lang.StackWalker.StackFrame;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import learn.trace.Source;
import learn.trace.TraceRecorder;

/**
 * Turns each {@link HashMapProbe} event into one trace step: a caption, the line in {@link
 * ChainedHashMap} that raised the event, and a snapshot of the map taken from {@link
 * ChainedHashMap#buckets()}.
 *
 * <p>One exception: while a resize is moving nodes, the old table's chains are half rewired and the
 * new table is not yet installed, so {@code buckets()} cannot give a true picture. Those steps use
 * a working view instead. It starts from the real snapshot taken when the resize begins, laid out
 * in a table of the new size with every node at its old index (a valid index there too). Each
 * {@code moved} event then does what {@code resize()} does: take the node out of its old bucket and
 * link it at the head of its new one, even when the index is unchanged. When {@code resized}
 * arrives the working view must equal the real {@code buckets()}, or recording fails. During those
 * steps {@code threshold} stays at the map's real value, the old threshold, until the resize
 * finishes.
 */
final class HashMapTraceProbe implements HashMapProbe {

  static final String FILE = "ChainedHashMap.java";

  private static final StackWalker WALKER =
      StackWalker.getInstance(StackWalker.Option.RETAIN_CLASS_REFERENCE);

  private final TraceRecorder recorder;
  private final ChainedHashMap<?, ?> map;

  /** The current put's key and bucket; null outside a put. */
  private Map<String, Object> pipeline;

  private Object key;

  /** The table part way through the current resize, rebuilt from the events; null otherwise. */
  private List<List<Map<String, Object>>> resizing;

  /** Ids of the nodes the current resize has already relinked. */
  private final Set<String> moved = new HashSet<>();

  HashMapTraceProbe(TraceRecorder recorder, ChainedHashMap<?, ?> map) {
    this.recorder = recorder;
    this.map = map;
  }

  @Override
  public void hashed(Object key, int hashCode, int spread, int index) {
    this.key = key;
    pipeline = pipeline(key, hashCode, spread, index);
    int capacity = map.capacity();
    String spreading =
        spread == hashCode
            ? ". Its high 16 bits are all zero, so spreading leaves it unchanged"
            : ". Spreading mixes the high 16 bits into the low 16 to give " + hex(spread);
    step(
        "put("
            + describe(key)
            + "): hashCode() is "
            + hex(hashCode)
            + spreading
            + ", and its low "
            + Integer.numberOfTrailingZeros(capacity)
            + " bits pick bucket "
            + index
            + " of "
            + capacity
            + ".",
        focus(index, null),
        pipeline);
  }

  @Override
  public void visited(int bucket, int position, boolean matched) {
    Object other = map.buckets().get(bucket).get(position).key();
    String where = "Node " + (position + 1) + " of bucket " + bucket + " holds " + describe(other);
    step(
        where + (matched ? ": a match." : ", not " + describe(key) + "."),
        focus(bucket, id(other)),
        pipeline);
  }

  @Override
  public void linked(Object key, int bucket) {
    int others = map.buckets().get(bucket).size() - 1;
    String placed =
        others == 0
            ? "Bucket " + bucket + " was empty, so " + describe(key) + " becomes its only node."
            : describe(key)
                + " is not in bucket "
                + bucket
                + ", so a new node goes at the head of the chain, in front of "
                + others
                + (others == 1 ? " other." : " others.");
    step(placed + " Size is now " + map.size() + ".", focus(bucket, id(key)), pipeline);
  }

  @Override
  public void replaced(Object key, int bucket) {
    step(
        describe(key)
            + " is already in bucket "
            + bucket
            + ", so put() replaces its value and size stays at "
            + map.size()
            + ".",
        focus(bucket, id(key)),
        pipeline);
  }

  @Override
  public void resizing(int oldCapacity, int newCapacity) {
    pipeline = null;
    key = null;
    resizing = snapshot(map);
    moved.clear();
    while (resizing.size() < newCapacity) {
      resizing.add(new ArrayList<>());
    }
    resizingStep(
        "Size "
            + map.size()
            + " is over the threshold of "
            + map.threshold()
            + ", so the table doubles from "
            + oldCapacity
            + " to "
            + newCapacity
            + " buckets. Each node can only keep its index or move up by "
            + oldCapacity
            + ", and resize() relinks them one at a time.",
        null);
  }

  @Override
  public void moved(Object key, int fromBucket, int toBucket) {
    String id = id(key);
    List<Map<String, Object>> from = resizing.get(fromBucket);
    int at = indexOf(from, id);
    if (at < 0) {
      throw new IllegalStateException(
          id + " moved from bucket " + fromBucket + " but is not in it");
    }
    Map<String, Object> node = from.remove(at);
    List<Map<String, Object>> to = resizing.get(toBucket);
    int alreadyMoved = 0;
    for (Map<String, Object> other : to) {
      alreadyMoved += moved.contains(other.get("id")) ? 1 : 0;
    }
    to.addFirst(node);
    moved.add(id);
    String others =
        alreadyMoved == 0
            ? "."
            : ", linked at the head in front of "
                + alreadyMoved
                + (alreadyMoved == 1 ? " node" : " nodes")
                + " already moved there, so the chain's order is reversed.";
    String caption =
        fromBucket == toBucket
            ? describe(key) + " stays in bucket " + toBucket + others
            : describe(key)
                + " moves from bucket "
                + fromBucket
                + " to bucket "
                + toBucket
                + " ("
                + fromBucket
                + " + "
                + (toBucket - fromBucket)
                + ")"
                + others;
    resizingStep(caption, focus(toBucket, id));
  }

  @Override
  public void resized(int capacity) {
    List<List<Map<String, Object>>> real = snapshot(map);
    for (int b = 0; b < Math.max(real.size(), resizing.size()); b++) {
      Object rebuilt = b < resizing.size() ? resizing.get(b) : "no bucket";
      Object actual = b < real.size() ? real.get(b) : "no bucket";
      if (!rebuilt.equals(actual)) {
        throw new IllegalStateException(
            "rebuilt resize view differs from buckets() at bucket "
                + b
                + ": rebuilt "
                + rebuilt
                + ", real "
                + actual);
      }
    }
    resizing = null;
    step(
        "Every node is in its new bucket. The table now has "
            + capacity
            + " buckets and the next resize comes when the size passes "
            + map.threshold()
            + ".",
        null,
        null);
  }

  /**
   * Records a step with a snapshot of the map. Call it from inside a probe method so the source
   * line is the one in {@link ChainedHashMap} that raised the event.
   */
  void step(String caption, Map<String, Object> focus, Map<String, Object> pipeline) {
    recorder.step(
        caption,
        callerSource(),
        state(map.capacity(), map.size(), map.threshold(), snapshot(map), focus, pipeline));
  }

  private void resizingStep(String caption, Map<String, Object> focus) {
    recorder.step(
        caption,
        callerSource(),
        state(resizing.size(), map.size(), map.threshold(), resizing, focus, null));
  }

  private static int indexOf(List<Map<String, Object>> chain, String id) {
    for (int i = 0; i < chain.size(); i++) {
      if (id.equals(chain.get(i).get("id"))) {
        return i;
      }
    }
    return -1;
  }

  // State building, shared with scenarios that compute a state without a map.

  static Map<String, Object> state(
      int capacity,
      int size,
      int threshold,
      List<? extends List<Map<String, Object>>> buckets,
      Map<String, Object> focus,
      Map<String, Object> pipeline) {
    Map<String, Object> state = new LinkedHashMap<>();
    state.put("capacity", capacity);
    state.put("size", size);
    state.put("threshold", threshold);
    state.put("buckets", buckets);
    state.put("focus", focus);
    state.put("pipeline", pipeline);
    return state;
  }

  static Map<String, Object> node(Object key, Object value, int hash) {
    Map<String, Object> node = new LinkedHashMap<>();
    node.put("id", id(key));
    node.put("key", String.valueOf(key));
    node.put("value", String.valueOf(value));
    node.put("hash", hex(hash));
    return node;
  }

  /** {@code node} may be null when the focus is a bucket rather than one node in it. */
  static Map<String, Object> focus(int bucket, String node) {
    Map<String, Object> focus = new LinkedHashMap<>();
    focus.put("bucket", bucket);
    focus.put("node", node);
    return focus;
  }

  static Map<String, Object> pipeline(Object key, int hashCode, int spread, int index) {
    Map<String, Object> pipeline = new LinkedHashMap<>();
    pipeline.put("key", String.valueOf(key));
    pipeline.put("hashCode", hex(hashCode));
    pipeline.put("spread", hex(spread));
    pipeline.put("index", index);
    return pipeline;
  }

  static String id(Object key) {
    return "k:" + key;
  }

  static String hex(int value) {
    return String.format("0x%08x", value);
  }

  private static List<List<Map<String, Object>>> snapshot(ChainedHashMap<?, ?> map) {
    List<List<Map<String, Object>>> buckets = new ArrayList<>();
    for (List<ChainedHashMap.NodeView> chain : map.buckets()) {
      List<Map<String, Object>> nodes = new ArrayList<>();
      for (ChainedHashMap.NodeView view : chain) {
        nodes.add(node(view.key(), view.value(), view.hash()));
      }
      buckets.add(nodes);
    }
    return buckets;
  }

  private static String describe(Object key) {
    return key instanceof String ? "\"" + key + "\"" : String.valueOf(key);
  }

  private static Source callerSource() {
    int line =
        WALKER.walk(frames ->
            frames
                .filter(frame -> frame.getDeclaringClass() == ChainedHashMap.class)
                .findFirst()
                .map(StackFrame::getLineNumber)
                .orElseThrow(() -> new IllegalStateException("not called from ChainedHashMap")));
    return new Source(FILE, line);
  }
}
