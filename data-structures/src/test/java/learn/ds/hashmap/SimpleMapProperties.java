package learn.ds.hashmap;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.IntFunction;
import java.util.function.Supplier;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;

/**
 * Model-based tests: run a random sequence of operations against our map and against {@link
 * java.util.HashMap}, and require the same answer at every step.
 */
class SimpleMapProperties {

  enum Kind {
    PUT,
    GET,
    REMOVE,
    CONTAINS
  }

  record Operation(Kind kind, int key, int value) {}

  /** Only three distinct hash codes, so chains get long and removal paths are exercised. */
  record Crowded(int id) {
    @Override
    public int hashCode() {
      return id % 3;
    }
  }

  @Provide
  Arbitrary<List<Operation>> operations() {
    Arbitrary<Kind> kinds = Arbitraries.of(Kind.class);
    Arbitrary<Integer> keys = Arbitraries.integers().between(0, 60);
    Arbitrary<Integer> values = Arbitraries.integers();
    return Combinators.combine(kinds, keys, values).as(Operation::new).list().ofMaxSize(300);
  }

  @Property
  void chainedHashMapBehavesLikeJavaUtilHashMap(@ForAll("operations") List<Operation> operations) {
    // Capacity 1 forces a resize on almost every early insert.
    assertSameBehaviour(() -> new ChainedHashMap<>(1), Integer::valueOf, operations);
  }

  @Property
  void chainedHashMapBehavesLikeJavaUtilHashMapWhenKeysCollide(
      @ForAll("operations") List<Operation> operations) {
    assertSameBehaviour(ChainedHashMap::new, Crowded::new, operations);
  }

  @Property
  void associationListMapBehavesLikeJavaUtilHashMap(
      @ForAll("operations") List<Operation> operations) {
    assertSameBehaviour(AssociationListMap::new, Integer::valueOf, operations);
  }

  private static <K> void assertSameBehaviour(
      Supplier<SimpleMap<K, Integer>> factory, IntFunction<K> toKey, List<Operation> operations) {
    SimpleMap<K, Integer> actual = factory.get();
    Map<K, Integer> model = new HashMap<>();

    for (Operation operation : operations) {
      K key = toKey.apply(operation.key());
      switch (operation.kind()) {
        case PUT ->
            assertThat(actual.put(key, operation.value()))
                .isEqualTo(model.put(key, operation.value()));
        case GET -> assertThat(actual.get(key)).isEqualTo(model.get(key));
        case REMOVE -> assertThat(actual.remove(key)).isEqualTo(model.remove(key));
        case CONTAINS -> assertThat(actual.containsKey(key)).isEqualTo(model.containsKey(key));
      }
      assertThat(actual.size()).isEqualTo(model.size());
    }
  }
}
