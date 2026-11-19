package learn.ds.hashmap;

/**
 * The smallest useful map contract. Deliberately not {@link java.util.Map}: that interface has
 * dozens of methods, and the point here is the storage strategy behind four of them.
 *
 * <p>Null keys and null values are allowed, as they are in {@link java.util.HashMap}.
 */
public interface SimpleMap<K, V> {

  /** Associates {@code value} with {@code key}. Returns the previous value, or null if none. */
  V put(K key, V value);

  /** Returns the value for {@code key}, or null if the key is absent (or mapped to null). */
  V get(K key);

  /** Removes {@code key}. Returns the value it had, or null if it was absent. */
  V remove(K key);

  boolean containsKey(K key);

  int size();

  default boolean isEmpty() {
    return size() == 0;
  }
}
