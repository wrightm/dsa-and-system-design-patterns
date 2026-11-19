# Library studies

Reading real source code: what it does, which decisions it made, and what each one cost. Every study pins its links to a tag or commit.

## JDK collections

- [ ] **`ArrayList`**: growth policy, `modCount`, `subList`
- [x] **[`HashMap`](../data-structures/src/main/java/learn/ds/hashmap/README.md)**: spreading, resize split, treeification (covered in the hash map article)
- [ ] **`LinkedHashMap`**: access order and `removeEldestEntry`
- [ ] **`TreeMap`**: red-black tree and navigable views
- [ ] **`PriorityQueue`**: sift up, sift down, heapify
- [ ] **`ArrayDeque`**: circular array
- [ ] **`IdentityHashMap`**: linear probing in one array
- [ ] **`EnumMap` and `EnumSet`**
- [ ] **`BitSet`**
- [ ] **Immutable collections (`List.of`, `Map.of`)**: specialised small classes
- [ ] **`Arrays.sort`**: dual-pivot quicksort and TimSort
- [ ] **`Collections.shuffle` and `binarySearch`**

## JDK concurrency

- [ ] **`ConcurrentHashMap`**: bin locking, counters, transfer
- [ ] **`ConcurrentSkipListMap`**
- [ ] **`CopyOnWriteArrayList`**
- [ ] **`AbstractQueuedSynchronizer`**
- [ ] **`ReentrantLock` and `ReentrantReadWriteLock`**
- [ ] **`ThreadPoolExecutor`**: `ctl`, workers, shutdown
- [ ] **`ForkJoinPool`**: work stealing
- [ ] **`CompletableFuture`**: completion stack
- [ ] **`LongAdder` and `Striped64`**
- [ ] **`LinkedBlockingQueue` and `ArrayBlockingQueue`**
- [ ] **`SynchronousQueue` and `LinkedTransferQueue`**
- [ ] **Virtual thread scheduler and continuations**

## JDK, other

- [ ] **`String`**: compact strings, hash caching, `intern`
- [ ] **`StringBuilder`**
- [ ] **Stream pipeline**: stages, sinks, spliterators
- [ ] **`Optional`**
- [ ] **`java.util.regex`**
- [ ] **`ThreadLocal` and its map**
- [ ] **`ServiceLoader`**
- [ ] **`java.lang.reflect.Proxy`**

## Collections and data structure libraries

- [ ] **Guava**: immutable collections
- [ ] **Guava**: `BloomFilter`
- [ ] **Guava**: `RateLimiter`
- [ ] **Guava**: `Striped`, `EventBus`
- [ ] **Caffeine**: W-TinyLFU, frequency sketch, timer wheel
- [ ] **Eclipse Collections**: primitive collections
- [ ] **fastutil**: open addressing maps
- [ ] **RoaringBitmap**
- [ ] **HdrHistogram**
- [ ] **Vavr**: persistent collections

## Concurrency and networking libraries

- [ ] **LMAX Disruptor**: ring buffer and sequences
- [ ] **JCTools**: SPSC and MPSC queues
- [ ] **Agrona**: buffers and agents
- [ ] **Netty**: event loop
- [ ] **Netty**: pipeline and handlers
- [ ] **Netty**: pooled buffer allocator
- [ ] **Netty**: `HashedWheelTimer`
- [ ] **Project Reactor**: operators and backpressure
- [ ] **Pekko**: actors and mailboxes
- [ ] **gRPC-Java**: channels and stubs
- [ ] **HikariCP**: `ConcurrentBag`

## Distributed systems

- [ ] **Apache Kafka**: log segments and index
- [ ] **Apache Kafka**: replication and ISR
- [ ] **Apache Kafka**: consumer group coordination
- [ ] **Apache Kafka**: KRaft
- [ ] **Apache ZooKeeper**: ZAB and znodes
- [ ] **Apache Ratis**: Raft
- [ ] **Apache Cassandra**: gossip and failure detection
- [ ] **Apache Cassandra**: storage engine
- [ ] **RocksDB (through its Java API)**: compaction
- [ ] **Apache Lucene**: inverted index and skip lists
- [ ] **Apache Lucene**: finite state transducers
- [ ] **Hazelcast**: partitioning and near cache
- [ ] **Debezium**: change data capture
- [ ] **Resilience4j**: circuit breaker state machine
- [ ] **Resilience4j**: rate limiter and bulkhead

## Frameworks

- [ ] **Spring Framework**: bean container and dependency injection
- [ ] **Spring Framework**: AOP proxies
- [ ] **Spring Framework**: `JdbcTemplate` and template method
- [ ] **Spring Integration**: enterprise integration patterns
- [ ] **Apache Camel**: routes and processors
- [ ] **Hibernate**: session, unit of work, identity map
- [ ] **Axon Framework**: CQRS and event sourcing
- [ ] **Jackson**: streaming parser and databind
- [ ] **Logback or Log4j 2**: appenders and async logging
- [ ] **JUnit Platform**: engines and discovery
