package learn.ds.hashmap;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * The naive map: a list of key-value pairs, searched from the front every time.
 *
 * <p>Correct, tiny, and O(n) for every operation. It exists so the article has something to break,
 * and so the benchmarks have a baseline.
 */
public final class AssociationListMap<K, V> implements SimpleMap<K, V> {

  private static final class Pair<K, V> {
    final K key;
    V value;

    Pair(K key, V value) {
      this.key = key;
      this.value = value;
    }
  }

  private final List<Pair<K, V>> pairs = new ArrayList<>();

  @Override
  public V put(K key, V value) {
    Pair<K, V> existing = find(key);
    if (existing != null) {
      V previous = existing.value;
      existing.value = value;
      return previous;
    }
    pairs.add(new Pair<>(key, value));
    return null;
  }

  @Override
  public V get(K key) {
    Pair<K, V> pair = find(key);
    return pair == null ? null : pair.value;
  }

  @Override
  public V remove(K key) {
    for (int i = 0; i < pairs.size(); i++) {
      if (Objects.equals(pairs.get(i).key, key)) {
        return pairs.remove(i).value;
      }
    }
    return null;
  }

  @Override
  public boolean containsKey(K key) {
    return find(key) != null;
  }

  @Override
  public int size() {
    return pairs.size();
  }

  private Pair<K, V> find(K key) {
    for (Pair<K, V> pair : pairs) {
      if (Objects.equals(pair.key, key)) {
        return pair;
      }
    }
    return null;
  }
}
