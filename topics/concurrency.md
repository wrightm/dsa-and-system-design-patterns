# Concurrency

## The model

- [ ] **Threads and their lifecycle**
- [ ] **Race conditions and critical sections**
- [ ] **The Java Memory Model and happens-before**
- [ ] **`volatile`: visibility without atomicity**
- [ ] **Safe publication and immutability**
- [ ] **Deadlock, livelock and starvation**
- [ ] **Amdahl's law and contention**
- [ ] **False sharing** — wild: `@Contended`, Disruptor padding

## Locks and synchronisers

- [ ] **`synchronized` and monitors**
- [ ] **`wait`, `notify` and condition variables**
- [ ] **ReentrantLock and fairness** — wild: AQS
- [ ] **ReadWriteLock**
- [ ] **StampedLock and optimistic reads**
- [ ] **Semaphore**
- [ ] **CountDownLatch and CyclicBarrier**
- [ ] **Phaser and Exchanger**
- [ ] **Spin locks and backoff**
- [ ] **Lock striping** — wild: Guava Striped
- [ ] **Double-checked locking and lazy holders**

## Lock-free building blocks

- [ ] **Atomics and compare-and-swap**
- [ ] **The ABA problem**
- [ ] **`VarHandle`**
- [ ] **Lock-free vs wait-free vs obstruction-free**
- [ ] **Memory reclamation: why Java gets it easy**

## Executing work

- [ ] **Executors and thread pools** — wild: ThreadPoolExecutor
- [ ] **Queueing and rejection policies**
- [ ] **Fork/Join and work stealing** — wild: ForkJoinPool
- [ ] **`Future` and `CompletableFuture`**
- [ ] **Virtual threads** — wild: JEP 444
- [ ] **Structured concurrency**
- [ ] **Scoped values and thread-locals**
- [ ] **Scheduling and timers** — wild: ScheduledThreadPoolExecutor
- [ ] **Interruption and cancellation**
- [ ] **Parallel streams and spliterators**

## Classic problems

- [ ] **Producer-consumer**
- [ ] **Readers-writers**
- [ ] **Dining philosophers**
- [ ] **Sleeping barber**
- [ ] **Print in order, alternate threads and similar puzzles**

## Concurrency patterns

- [ ] **Thread confinement**
- [ ] **Monitor object**
- [ ] **Active object**
- [ ] **Balking and guarded suspension**
- [ ] **Thread-per-request vs event loop**
- [ ] **Reactor and proactor** — wild: Netty, NIO Selector
- [ ] **Half-sync/half-async**
- [ ] **Leader/followers**
- [ ] **Actor model** — wild: Pekko
- [ ] **Communicating sequential processes**
- [ ] **Reactive streams and backpressure** — wild: Reactor, Flow API
- [ ] **Single-writer principle** — wild: Disruptor
- [ ] **Batching and coalescing**
