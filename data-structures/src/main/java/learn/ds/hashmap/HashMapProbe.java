package learn.ds.hashmap;

/**
 * Listens to {@link ChainedHashMap} as it works, so a test can record each step for the site's
 * animations. Every method does nothing by default; a listener overrides the ones it needs.
 *
 * <p>A probe only observes. It must not call back into the map in a way that changes it.
 */
interface HashMapProbe {

  /** The probe every map starts with: it ignores everything. */
  HashMapProbe NONE = new HashMapProbe() {};

  /** {@code put} turned {@code key} into a bucket: hash code, then spread, then mask. */
  default void hashed(Object key, int hashCode, int spread, int index) {}

  /** {@code put} compared its key with the node at {@code position} (0 is the head) in a chain. */
  default void visited(int bucket, int position, boolean matched) {}

  /** {@code put} added a new node for {@code key} at the head of {@code bucket}. */
  default void linked(Object key, int bucket) {}

  /** {@code put} found {@code key} already in {@code bucket} and replaced its value. */
  default void replaced(Object key, int bucket) {}

  /** The table is about to grow. */
  default void resizing(int oldCapacity, int newCapacity) {}

  /**
   * During a resize, the node for {@code key} went from one bucket to its bucket in the new table.
   */
  default void moved(Object key, int fromBucket, int toBucket) {}

  /** The resize has finished and the map now uses the new table. */
  default void resized(int capacity) {}
}
