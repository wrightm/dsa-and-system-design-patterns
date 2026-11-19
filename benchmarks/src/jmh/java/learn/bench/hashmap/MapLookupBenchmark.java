package learn.bench.hashmap;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import learn.ds.hashmap.AssociationListMap;
import learn.ds.hashmap.ChainedHashMap;
import learn.ds.hashmap.SimpleMap;
import org.openjdk.jmh.annotations.Benchmark;
import org.openjdk.jmh.annotations.BenchmarkMode;
import org.openjdk.jmh.annotations.Mode;
import org.openjdk.jmh.annotations.OutputTimeUnit;
import org.openjdk.jmh.annotations.Param;
import org.openjdk.jmh.annotations.Scope;
import org.openjdk.jmh.annotations.Setup;
import org.openjdk.jmh.annotations.State;

/**
 * Average time for one successful lookup, as the number of entries grows.
 *
 * <p>Run with: {@code ./gradlew :benchmarks:jmh -Pjmh.include=MapLookupBenchmark}
 */
@State(Scope.Thread)
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
public class MapLookupBenchmark {

  @Param({"100", "10000"})
  int entries;

  private SimpleMap<Integer, Integer> associationList;
  private SimpleMap<Integer, Integer> chained;
  private Map<Integer, Integer> jdk;
  private int next;

  @Setup
  public void fill() {
    associationList = new AssociationListMap<>();
    chained = new ChainedHashMap<>();
    jdk = new HashMap<>();
    for (int i = 0; i < entries; i++) {
      associationList.put(i, i);
      chained.put(i, i);
      jdk.put(i, i);
    }
  }

  private Integer nextKey() {
    next = (next + 7919) % entries; // stride by a prime so lookups hop around the key space
    return next;
  }

  @Benchmark
  public Integer associationListMap() {
    return associationList.get(nextKey());
  }

  @Benchmark
  public Integer chainedHashMap() {
    return chained.get(nextKey());
  }

  @Benchmark
  public Integer javaUtilHashMap() {
    return jdk.get(nextKey());
  }
}
