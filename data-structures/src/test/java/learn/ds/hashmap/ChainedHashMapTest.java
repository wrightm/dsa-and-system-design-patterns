package learn.ds.hashmap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ChainedHashMapTest {

  /** Every instance has the same hash code, so every instance lands in the same bucket. */
  private record Colliding(String name) {
    @Override
    public int hashCode() {
      return 42;
    }
  }

  @Test
  void returnsWhatWasPut() {
    ChainedHashMap<String, Integer> map = new ChainedHashMap<>();

    assertThat(map.put("a", 1)).isNull();
    assertThat(map.put("b", 2)).isNull();

    assertThat(map.get("a")).isEqualTo(1);
    assertThat(map.get("b")).isEqualTo(2);
    assertThat(map.get("missing")).isNull();
    assertThat(map.size()).isEqualTo(2);
  }

  @Test
  void puttingAnExistingKeyReplacesTheValueAndReturnsTheOldOne() {
    ChainedHashMap<String, Integer> map = new ChainedHashMap<>();
    map.put("a", 1);

    assertThat(map.put("a", 2)).isEqualTo(1);

    assertThat(map.get("a")).isEqualTo(2);
    assertThat(map.size()).isEqualTo(1);
  }

  @Test
  void keysWithTheSameHashCodeStayDistinct() {
    ChainedHashMap<Colliding, Integer> map = new ChainedHashMap<>();
    map.put(new Colliding("x"), 1);
    map.put(new Colliding("y"), 2);
    map.put(new Colliding("z"), 3);

    assertThat(map.get(new Colliding("x"))).isEqualTo(1);
    assertThat(map.get(new Colliding("y"))).isEqualTo(2);
    assertThat(map.get(new Colliding("z"))).isEqualTo(3);
    assertThat(map.longestChain()).isEqualTo(3);
  }

  @Test
  void removesFromTheHeadMiddleAndTailOfAChain() {
    ChainedHashMap<Colliding, Integer> map = new ChainedHashMap<>();
    // New nodes go to the head of the chain, so the chain reads c -> b -> a.
    map.put(new Colliding("a"), 1);
    map.put(new Colliding("b"), 2);
    map.put(new Colliding("c"), 3);

    assertThat(map.remove(new Colliding("b"))).isEqualTo(2); // middle
    assertThat(map.remove(new Colliding("c"))).isEqualTo(3); // head
    assertThat(map.remove(new Colliding("a"))).isEqualTo(1); // tail, and last one left
    assertThat(map.remove(new Colliding("a"))).isNull();

    assertThat(map.isEmpty()).isTrue();
  }

  @Test
  void allowsANullKey() {
    ChainedHashMap<String, Integer> map = new ChainedHashMap<>();

    map.put(null, 7);

    assertThat(map.get(null)).isEqualTo(7);
    assertThat(map.containsKey(null)).isTrue();
    assertThat(map.remove(null)).isEqualTo(7);
    assertThat(map.containsKey(null)).isFalse();
  }

  @Test
  void containsKeyTellsANullValueApartFromAnAbsentKey() {
    ChainedHashMap<String, Integer> map = new ChainedHashMap<>();
    map.put("present", null);

    assertThat(map.get("present")).isNull();
    assertThat(map.get("absent")).isNull();
    assertThat(map.containsKey("present")).isTrue();
    assertThat(map.containsKey("absent")).isFalse();
  }

  @Test
  void doublesWhenLoadFactorIsExceeded() {
    ChainedHashMap<Integer, Integer> map = new ChainedHashMap<>(16);
    for (int i = 0; i < 12; i++) {
      map.put(i, i);
    }
    assertThat(map.capacity()).isEqualTo(16); // 12 entries = exactly 75% of 16

    map.put(12, 12);

    assertThat(map.capacity()).isEqualTo(32);
  }

  @Test
  void keepsEveryEntryAcrossManyResizes() {
    ChainedHashMap<Integer, String> map = new ChainedHashMap<>(1);

    for (int i = 0; i < 10_000; i++) {
      map.put(i, "v" + i);
    }

    assertThat(map.size()).isEqualTo(10_000);
    for (int i = 0; i < 10_000; i++) {
      assertThat(map.get(i)).isEqualTo("v" + i);
    }
    assertThat(map.capacity()).isEqualTo(16_384); // smallest power of two with 75% above 10,000
  }

  @ParameterizedTest
  @CsvSource({"1, 1", "2, 2", "3, 4", "16, 16", "17, 32", "1000, 1024"})
  void capacityRoundsUpToAPowerOfTwo(int requested, int expected) {
    assertThat(new ChainedHashMap<String, String>(requested).capacity()).isEqualTo(expected);
  }

  @Test
  void rejectsACapacityBelowOne() {
    assertThatIllegalArgumentException().isThrownBy(() -> new ChainedHashMap<String, String>(0));
  }

  @Test
  void maskingAgreesWithFloorModForNegativeHashes() {
    int negativeHash = -7; // hashCode() is free to return any int, including negative ones

    assertThat(negativeHash % 16).isNegative(); // would be an invalid array index
    assertThat(ChainedHashMap.indexFor(negativeHash, 16))
        .isEqualTo(Math.floorMod(negativeHash, 16));
  }

  /**
   * The case named in the JDK's own comment on {@code HashMap.hash}: Float keys holding whole
   * numbers. Their hash codes differ only in the high bits, so a mask over the low bits sends all
   * of them to bucket 0.
   */
  @Test
  void spreadingRescuesKeysThatDifferOnlyInTheirHighBits() {
    int capacity = 1024;
    Set<Integer> bucketsWithoutSpreading = new HashSet<>();
    Set<Integer> bucketsWithSpreading = new HashSet<>();

    for (int i = 1; i <= 255; i++) {
      Float key = (float) i;
      bucketsWithoutSpreading.add(ChainedHashMap.indexFor(key.hashCode(), capacity));
      bucketsWithSpreading.add(ChainedHashMap.indexFor(ChainedHashMap.spread(key), capacity));
    }

    assertThat(bucketsWithoutSpreading).containsExactly(0);
    assertThat(bucketsWithSpreading).hasSize(255);
  }

  @Test
  void aKeyMutatedAfterInsertionCanNoLongerBeFound() {
    ChainedHashMap<List<String>, String> map = new ChainedHashMap<>();
    List<String> key = new ArrayList<>(List.of("a"));
    map.put(key, "value");

    key.add("b"); // changes key.hashCode(), but the entry stays in its old bucket

    assertThat(map.get(key)).isNull();
    assertThat(map.size()).isEqualTo(1); // still in there, unreachable by lookup
  }
}
