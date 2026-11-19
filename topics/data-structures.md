# Data structures

## Linear

- [ ] **Static array**
- [ ] **Dynamic array** — needs: amortised analysis · wild: ArrayList
- [ ] **Singly linked list**
- [ ] **Doubly linked list** — wild: LinkedList
- [ ] **Circular linked list**
- [ ] **Skip list** — needs: linked list, probability · wild: ConcurrentSkipListMap, Lucene
- [ ] **Unrolled linked list**
- [ ] **Stack** — wild: ArrayDeque
- [ ] **Queue** — wild: ArrayDeque, LinkedList
- [ ] **Deque** — wild: ArrayDeque
- [ ] **Circular buffer (ring buffer)** — wild: ArrayDeque, Disruptor
- [ ] **Monotonic stack** — needs: stack
- [ ] **Monotonic queue** — needs: deque
- [ ] **Gap buffer**
- [ ] **Rope** — needs: binary tree

## Hashing

- [ ] **Hash functions** (division, multiplication, universal, cryptographic vs non-cryptographic) — wild: String.hashCode, Murmur3 in Guava
- [x] **[Hash map (separate chaining)](../data-structures/src/main/java/learn/ds/hashmap/README.md)** — needs: array, linked list · wild: HashMap
- [ ] **Hash set** — needs: hash map · wild: HashSet
- [ ] **Open addressing: linear probing** — needs: hash map · wild: IdentityHashMap
- [ ] **Open addressing: quadratic probing and double hashing**
- [ ] **Robin Hood hashing**
- [ ] **Cuckoo hashing**
- [ ] **Hopscotch hashing**
- [ ] **Swiss tables** — wild: Abseil, Rust hashbrown
- [ ] **Resizing strategies and load factor** — wild: HashMap.resize
- [ ] **Treeified buckets** — needs: red-black tree · wild: HashMap.TreeNode
- [ ] **Linked hash map** — needs: hash map, doubly linked list · wild: LinkedHashMap
- [ ] **Identity, weak and enum maps** — wild: IdentityHashMap, WeakHashMap, EnumMap
- [ ] **Multimap, multiset and bidirectional map** — wild: Guava
- [ ] **Primitive-specialised maps** — wild: fastutil, Eclipse Collections
- [ ] **Perfect hashing**
- [ ] **Consistent hashing** — wild: Cassandra, Ketama
- [ ] **Rendezvous (highest random weight) hashing**
- [ ] **Hash flooding and defences** — wild: JEP 180, SipHash

## Trees

- [ ] **Binary tree and traversals** (pre, in, post, level order, Morris)
- [ ] **Binary search tree**
- [ ] **AVL tree** — needs: BST
- [ ] **Red-black tree** — needs: BST · wild: TreeMap
- [ ] **Left-leaning red-black tree**
- [ ] **Splay tree**
- [ ] **Treap** — needs: BST, heap
- [ ] **Scapegoat tree**
- [ ] **2-3 and 2-3-4 trees**
- [ ] **B-tree** — wild: database indexes
- [ ] **B+ tree** — wild: InnoDB, PostgreSQL
- [ ] **B\* tree and B-link tree**
- [ ] **Segment tree** — needs: binary tree
- [ ] **Segment tree with lazy propagation**
- [ ] **Persistent segment tree**
- [ ] **Fenwick tree (binary indexed tree)** — needs: bit manipulation
- [ ] **Interval tree**
- [ ] **Order-statistic tree**
- [ ] **Sparse table** — needs: dynamic programming
- [ ] **Cartesian tree**
- [ ] **k-d tree**
- [ ] **Quadtree and octree**
- [ ] **R-tree** — wild: PostGIS
- [ ] **Merkle tree** — wild: Git, Cassandra anti-entropy
- [ ] **van Emde Boas tree**
- [ ] **LSM tree** — wild: RocksDB, Cassandra
- [ ] **Fractal tree and Bε-tree**
- [ ] **N-ary tree and its encodings**
- [ ] **Threaded binary tree**

## Heaps and priority queues

- [ ] **Binary heap** — needs: array · wild: PriorityQueue
- [ ] **d-ary heap**
- [ ] **Indexed priority queue** — needs: binary heap
- [ ] **Min-max heap and double-ended priority queue**
- [ ] **Two-heap running median**
- [ ] **Binomial heap**
- [ ] **Fibonacci heap**
- [ ] **Pairing heap**
- [ ] **Leftist and skew heaps**
- [ ] **Delay queue and scheduled queue** — wild: DelayQueue, ScheduledThreadPoolExecutor

## Strings

- [ ] **Trie** — wild: Lucene
- [ ] **Compressed (radix) trie** — wild: Netty routing, Linux routing tables
- [ ] **Ternary search tree**
- [ ] **Suffix array and LCP array**
- [ ] **Suffix tree**
- [ ] **Suffix automaton**
- [ ] **Aho-Corasick automaton** — needs: trie
- [ ] **Burrows-Wheeler transform and FM-index**
- [ ] **Finite state transducer** — wild: Lucene FST
- [ ] **Inverted index** — wild: Lucene

## Graph representations and sets

- [ ] **Adjacency list and adjacency matrix**
- [ ] **Edge list**
- [ ] **Compressed sparse row**
- [ ] **Implicit graphs** (grids, state spaces)
- [ ] **Union-find (disjoint set)** with rank and path compression
- [ ] **Union-find with rollback**

## Probabilistic

- [ ] **Bloom filter** — needs: hash functions · wild: Guava BloomFilter, Cassandra
- [ ] **Counting Bloom filter**
- [ ] **Cuckoo filter**
- [ ] **Quotient filter**
- [ ] **Count-min sketch** — wild: Caffeine FrequencySketch
- [ ] **HyperLogLog** — wild: Redis
- [ ] **MinHash**
- [ ] **SimHash**
- [ ] **t-digest and quantile sketches** — wild: HdrHistogram
- [ ] **Reservoir sample**

## Bits and succinct structures

- [ ] **Bit set** — wild: BitSet
- [ ] **Bitmap index**
- [ ] **Roaring bitmap** — wild: RoaringBitmap
- [ ] **Rank and select**
- [ ] **Wavelet tree**

## Persistent and functional

- [ ] **Persistent (immutable) list**
- [ ] **Hash array mapped trie** — wild: Clojure, Scala, Vavr
- [ ] **Persistent vector**
- [ ] **Zipper**
- [ ] **Finger tree**
- [ ] **Copy-on-write collections** — wild: CopyOnWriteArrayList
- [ ] **Immutable collections** — wild: List.of, Guava ImmutableList

## Concurrent

- [ ] **Treiber stack** — needs: CAS
- [ ] **Michael-Scott queue** — needs: CAS · wild: ConcurrentLinkedQueue
- [ ] **Concurrent hash map** — needs: hash map, CAS · wild: ConcurrentHashMap
- [ ] **Concurrent skip list** — needs: skip list · wild: ConcurrentSkipListMap
- [ ] **Blocking queues** (array, linked, synchronous, transfer) — wild: java.util.concurrent
- [ ] **Bounded SPSC and MPSC queues** — wild: JCTools
- [ ] **Disruptor ring buffer** — wild: LMAX Disruptor
- [ ] **Work-stealing deque** — wild: ForkJoinPool
- [ ] **Striped counters** — wild: LongAdder

## Caches and timers

- [ ] **LRU cache** — needs: hash map, doubly linked list · wild: LinkedHashMap
- [ ] **LFU cache**
- [ ] **CLOCK and second chance**
- [ ] **2Q and ARC**
- [ ] **TinyLFU and W-TinyLFU** — needs: count-min sketch · wild: Caffeine
- [ ] **Expiring (TTL) cache**
- [ ] **Hashed and hierarchical timing wheels** — wild: Netty HashedWheelTimer, Kafka purgatory

## Storage-oriented

- [ ] **Append-only log**
- [ ] **SSTable and memtable** — needs: LSM tree
- [ ] **Slab and arena allocation** — wild: Netty PooledByteBufAllocator
- [ ] **Off-heap buffers** — wild: ByteBuffer, Agrona
