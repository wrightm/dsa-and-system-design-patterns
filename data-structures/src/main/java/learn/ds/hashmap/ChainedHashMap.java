package learn.ds.hashmap;

import java.util.Objects;

/**
 * A hash map using separate chaining: an array of buckets, each bucket a singly linked list.
 *
 * <p>The table length is always a power of two so a bucket index is a bit mask rather than a
 * division. The table doubles when the number of entries passes 75% of its length.
 *
 * <p>Not thread-safe. Worst case for every operation is O(n), when all keys land in one bucket;
 * {@link java.util.HashMap} avoids that by turning long chains into trees, which this class leaves
 * as an exercise.
 */
public final class ChainedHashMap<K, V> implements SimpleMap<K, V> {

  static final int DEFAULT_CAPACITY = 16;
  static final int MAXIMUM_CAPACITY = 1 << 30;
  static final float LOAD_FACTOR = 0.75f;

  private static final class Node<K, V> {
    final int hash;
    final K key;
    V value;
    Node<K, V> next;

    Node(int hash, K key, V value, Node<K, V> next) {
      this.hash = hash;
      this.key = key;
      this.value = value;
      this.next = next;
    }
  }

  private Node<K, V>[] table;
  private int size;
  private int threshold;

  public ChainedHashMap() {
    this(DEFAULT_CAPACITY);
  }

  /**
   * @param initialCapacity the minimum number of buckets; rounded up to a power of two
   */
  public ChainedHashMap(int initialCapacity) {
    if (initialCapacity < 1) {
      throw new IllegalArgumentException("initialCapacity must be at least 1: " + initialCapacity);
    }
    int capacity = tableSizeFor(initialCapacity);
    this.table = newTable(capacity);
    this.threshold = thresholdFor(capacity);
  }

  @Override
  public V put(K key, V value) {
    int hash = spread(key);
    int index = indexFor(hash, table.length);
    for (Node<K, V> node = table[index]; node != null; node = node.next) {
      if (matches(node, hash, key)) {
        V previous = node.value;
        node.value = value;
        return previous;
      }
    }
    table[index] = new Node<>(hash, key, value, table[index]);
    if (++size > threshold) {
      resize();
    }
    return null;
  }

  @Override
  public V get(K key) {
    Node<K, V> node = findNode(key);
    return node == null ? null : node.value;
  }

  @Override
  public boolean containsKey(K key) {
    return findNode(key) != null;
  }

  @Override
  public V remove(K key) {
    int hash = spread(key);
    int index = indexFor(hash, table.length);
    Node<K, V> previous = null;
    for (Node<K, V> node = table[index]; node != null; node = node.next) {
      if (matches(node, hash, key)) {
        if (previous == null) {
          table[index] = node.next;
        } else {
          previous.next = node.next;
        }
        size--;
        return node.value;
      }
      previous = node;
    }
    return null;
  }

  @Override
  public int size() {
    return size;
  }

  /** Number of buckets. Exposed for tests and for the article's experiments. */
  int capacity() {
    return table.length;
  }

  /** Length of the longest bucket chain. O(n); exposed for tests and experiments. */
  int longestChain() {
    int longest = 0;
    for (Node<K, V> head : table) {
      int length = 0;
      for (Node<K, V> node = head; node != null; node = node.next) {
        length++;
      }
      longest = Math.max(longest, length);
    }
    return longest;
  }

  /**
   * Mixes the high half of the hash code into the low half.
   *
   * <p>The bucket index only looks at the low bits, so without this step two keys whose hash codes
   * differ only in the high bits would always collide. Same transform as {@code
   * java.util.HashMap.hash}.
   */
  static int spread(Object key) {
    if (key == null) {
      return 0;
    }
    int h = key.hashCode();
    return h ^ (h >>> 16);
  }

  /** Bucket index for a hash. Requires {@code capacity} to be a power of two. */
  static int indexFor(int hash, int capacity) {
    return hash & (capacity - 1);
  }

  /** Smallest power of two that is at least {@code requested}, capped at the maximum. */
  static int tableSizeFor(int requested) {
    if (requested >= MAXIMUM_CAPACITY) {
      return MAXIMUM_CAPACITY;
    }
    return requested <= 1 ? 1 : Integer.highestOneBit(requested - 1) << 1;
  }

  private static int thresholdFor(int capacity) {
    return capacity >= MAXIMUM_CAPACITY ? Integer.MAX_VALUE : (int) (capacity * LOAD_FACTOR);
  }

  private Node<K, V> findNode(K key) {
    int hash = spread(key);
    for (Node<K, V> node = table[indexFor(hash, table.length)]; node != null; node = node.next) {
      if (matches(node, hash, key)) {
        return node;
      }
    }
    return null;
  }

  /** Compare the cached hash first: it is one int comparison and rules out most non-matches. */
  private static boolean matches(Node<?, ?> node, int hash, Object key) {
    return node.hash == hash && Objects.equals(node.key, key);
  }

  /** Doubles the table and moves every node to its new bucket, reusing the node objects. */
  private void resize() {
    Node<K, V>[] old = table;
    if (old.length >= MAXIMUM_CAPACITY) {
      threshold = Integer.MAX_VALUE;
      return;
    }
    int newCapacity = old.length << 1;
    Node<K, V>[] grown = newTable(newCapacity);
    for (Node<K, V> head : old) {
      Node<K, V> node = head;
      while (node != null) {
        Node<K, V> next = node.next;
        int index = indexFor(node.hash, newCapacity);
        node.next = grown[index];
        grown[index] = node;
        node = next;
      }
    }
    table = grown;
    threshold = thresholdFor(newCapacity);
  }

  @SuppressWarnings({"unchecked", "rawtypes"})
  private static <K, V> Node<K, V>[] newTable(int capacity) {
    return (Node<K, V>[]) new Node[capacity];
  }
}
