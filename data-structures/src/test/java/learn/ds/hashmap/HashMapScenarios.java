package learn.ds.hashmap;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import learn.trace.Step;
import learn.trace.Trace;
import learn.trace.TraceFiles;
import learn.trace.TraceRecorder;
import org.junit.jupiter.api.Test;

/**
 * Runs the real {@link ChainedHashMap} and records the traces the site replays as animations.
 *
 * <p>The traces are committed under {@code animations/}. The freshness tests fail when the code
 * would now record something different; {@code ./gradlew test -Ptraces.update} rewrites them.
 */
class HashMapScenarios {

  private static final Path ANIMATIONS = Path.of("src/main/java/learn/ds/hashmap/animations");
  private static final Path SOURCE = Path.of("src/main/java/learn/ds/hashmap/ChainedHashMap.java");

  // Scenarios

  /** Four new keys into eight buckets, then one key again so the value is replaced. */
  static Trace put() {
    TraceRecorder recorder =
        new TraceRecorder("put", "Five puts into an eight-bucket table", "hash-table", "chains");
    ChainedHashMap<String, Integer> map = new ChainedHashMap<>(8);
    map.probe(new HashMapTraceProbe(recorder, map));
    map.put("alice", 31);
    map.put("bob", 45);
    map.put("carol", 27);
    map.put("dave", 52);
    map.put("alice", 32);
    return recorder.build();
  }

  /** The default table holds 12 entries; the 13th pushes the size over the threshold. */
  static Trace resize() {
    TraceRecorder recorder =
        new TraceRecorder("resize", "The thirteenth put doubles the table", "hash-table", "chains");
    ChainedHashMap<String, Integer> map = new ChainedHashMap<>();
    map.probe(new HashMapTraceProbe(recorder, map));
    for (int i = 1; i <= 13; i++) {
      map.put(String.valueOf(i), i);
    }
    return recorder.build();
  }

  /**
   * Whole-number floats, first placed by masking their raw hash codes, then put into a real map,
   * which spreads them first. One step for every 16th key keeps the trace short.
   */
  static Trace highBits() {
    TraceRecorder recorder =
        new TraceRecorder(
            "high-bits", "Whole-number floats with and without spreading", "hash-table", "grid");
    ChainedHashMap<Float, Integer> map = new ChainedHashMap<>(1024);
    int capacity = map.capacity();
    int lowBits = Integer.numberOfTrailingZeros(capacity);

    // Phase one: where each key would land if the index came straight from hashCode().
    List<List<Map<String, Object>>> unspread = new ArrayList<>();
    for (int b = 0; b < capacity; b++) {
      unspread.add(new ArrayList<>());
    }
    for (int i = 1; i <= 255; i++) {
      Float key = (float) i;
      int index = ChainedHashMap.indexFor(key.hashCode(), capacity);
      // Newest first, the order a real chain would hold them in.
      unspread.get(index).addFirst(HashMapTraceProbe.node(key, i, key.hashCode()));
      if (recorded(i)) {
        int occupied = occupied(unspread);
        String caption =
            "Without spreading, the index is hashCode() masked to its low "
                + lowBits
                + " bits. After "
                + i
                + (i == 1 ? " key" : " keys")
                + (occupied == 1 ? ", every one has landed in bucket " + index : "")
                + ": "
                + occupied
                + (occupied == 1 ? " bucket" : " buckets")
                + " occupied.";
        recorder.step(
            caption,
            null,
            HashMapTraceProbe.state(
                capacity,
                i,
                map.threshold(),
                unspread,
                HashMapTraceProbe.focus(index, HashMapTraceProbe.id(key)),
                null));
      }
    }

    // Phase two: the same keys through the real put(), which spreads before masking.
    HashMapTraceProbe tracer = new HashMapTraceProbe(recorder, map);
    map.probe(
        new HashMapProbe() {
          private Map<String, Object> pipeline;

          @Override
          public void hashed(Object key, int hashCode, int spread, int index) {
            pipeline = HashMapTraceProbe.pipeline(key, hashCode, spread, index);
          }

          @Override
          public void linked(Object key, int bucket) {
            int count = map.size();
            if (recorded(count)) {
              int occupied = occupied(map.buckets());
              tracer.step(
                  "With spreading, put() mixes the high 16 bits of the hash code into the low 16"
                      + " before masking. After "
                      + count
                      + (count == 1 ? " key: " : " keys: ")
                      + occupied
                      + (occupied == 1 ? " bucket" : " buckets")
                      + " occupied.",
                  HashMapTraceProbe.focus(bucket, HashMapTraceProbe.id(key)),
                  pipeline);
            }
          }
        });
    for (int i = 1; i <= 255; i++) {
      map.put((float) i, i);
    }
    return recorder.build();
  }

  private static boolean recorded(int count) {
    return count % 16 == 0 || count == 255;
  }

  private static int occupied(List<? extends List<?>> buckets) {
    int occupied = 0;
    for (List<?> chain : buckets) {
      occupied += chain.isEmpty() ? 0 : 1;
    }
    return occupied;
  }

  // Tests

  @Test
  void putTraceIsFresh() {
    TraceFiles.assertFresh(put(), ANIMATIONS.resolve("put.trace.json"));
  }

  @Test
  void resizeTraceIsFresh() {
    TraceFiles.assertFresh(resize(), ANIMATIONS.resolve("resize.trace.json"));
  }

  @Test
  void highBitsTraceIsFresh() {
    TraceFiles.assertFresh(highBits(), ANIMATIONS.resolve("high-bits.trace.json"));
  }

  @Test
  void resizeTraceShowsTheTableDoublingOnTheThirteenthPut() {
    List<Step> steps = resize().steps();

    int firstAt16 = -1;
    int firstAt32 = -1;
    for (int i = 0; i < steps.size(); i++) {
      Object capacity = steps.get(i).state().get("capacity");
      if (firstAt16 < 0 && Integer.valueOf(16).equals(capacity)) {
        firstAt16 = i;
      }
      if (firstAt32 < 0 && Integer.valueOf(32).equals(capacity)) {
        firstAt32 = i;
      }
    }

    assertThat(firstAt16).isNotNegative();
    assertThat(firstAt32).isGreaterThan(firstAt16);
    assertThat(steps.getLast().state()).containsEntry("size", 13);
  }

  @Test
  void resizeStepsKeepEveryNodeExactlyOnceWhileTheChainsSplit() {
    List<Step> steps = resize().steps();
    int start = -1;
    for (int i = 0; i < steps.size(); i++) {
      if (steps.get(i).caption().contains("doubles from 16 to 32")) {
        start = i;
        break;
      }
    }
    assertThat(start).as("resizing step").isNotNegative();

    Step last = steps.getLast();
    List<Step> inProgress = steps.subList(start, steps.size() - 1);
    assertThat(inProgress).hasSize(1 + 13); // the resizing step, then one per node moved
    for (Step step : inProgress) {
      List<?> buckets = (List<?>) step.state().get("buckets");
      List<Object> ids = new ArrayList<>();
      for (Object chain : buckets) {
        for (Object node : (List<?>) chain) {
          ids.add(((Map<?, ?>) node).get("id"));
        }
      }
      assertThat(step.state()).containsEntry("capacity", 32);
      assertThat(buckets).hasSize(32);
      assertThat(ids).as(step.caption()).hasSize(13).doesNotHaveDuplicates();
    }
    assertThat(inProgress.getLast().state().get("buckets")).isEqualTo(last.state().get("buckets"));
  }

  /**
   * Integer keys that are multiples of 64 share a bucket in every table up to 64 long, so each
   * resize relinks long chains and reverses them. Recording fails if the rebuilt in-progress view
   * ends up different from the real table.
   */
  @Test
  void theRebuiltResizeViewMatchesTheRealTableWhenChainsReverse() {
    TraceRecorder recorder = new TraceRecorder("t", "t", "hash-table", "chains");
    ChainedHashMap<Integer, Integer> map = new ChainedHashMap<>(2);
    map.probe(new HashMapTraceProbe(recorder, map));

    for (int i = 0; i < 10; i++) {
      map.put(i * 64, i);
      map.put(i * 64 + 1, i);
    }

    assertThat(map.capacity()).isEqualTo(32);
    assertThat(map.longestChain()).isEqualTo(10);
    assertThat(recorder.build().steps())
        .anyMatch(step -> step.caption().contains("so the chain's order is reversed"));
  }

  @Test
  void highBitsTraceGoesFromOneOccupiedBucketTo255() {
    List<Step> steps = highBits().steps();

    assertThat(steps).hasSize(32);
    assertThat(steps.get(15).caption()).endsWith(": 1 bucket occupied.");
    assertThat(steps.getLast().caption()).endsWith(": 255 buckets occupied.");
  }

  @Test
  void everySourceLinePointsInsideChainedHashMap() throws IOException {
    List<String> lines = Files.readAllLines(SOURCE);
    for (Trace trace : List.of(put(), resize(), highBits())) {
      for (Step step : trace.steps()) {
        if (step.source() == null) {
          continue;
        }
        assertThat(step.source().file()).isEqualTo("ChainedHashMap.java");
        assertThat(step.source().line()).isBetween(1, lines.size());
        // The recorded line is the probe call itself.
        assertThat(lines.get(step.source().line() - 1)).contains("probe.");
      }
    }
  }

  @Test
  void aProbeDoesNotChangeBehaviour() {
    ChainedHashMap<String, Integer> plain = new ChainedHashMap<>(2);
    ChainedHashMap<String, Integer> probed = new ChainedHashMap<>(2);
    probed.probe(
        new HashMapTraceProbe(new TraceRecorder("t", "t", "hash-table", "chains"), probed));

    for (int i = 0; i < 100; i++) {
      String key = String.valueOf(i % 40);
      Integer fromPlain = plain.put(key, i);
      Integer fromProbed = probed.put(key, i);
      assertThat(fromProbed).isEqualTo(fromPlain);
    }

    assertThat(probed.buckets()).isEqualTo(plain.buckets());
    assertThat(probed.size()).isEqualTo(plain.size());
    assertThat(probed.capacity()).isEqualTo(plain.capacity());
  }
}
