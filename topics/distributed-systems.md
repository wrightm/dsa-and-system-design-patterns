# Distributed systems

## Fundamentals

- [ ] **The fallacies of distributed computing**
- [ ] **Failure models** (crash, omission, Byzantine)
- [ ] **Synchronous, asynchronous and partially synchronous systems**
- [ ] **Physical clocks, drift and NTP**
- [ ] **Lamport clocks**
- [ ] **Vector clocks and version vectors**
- [ ] **Hybrid logical clocks** — wild: CockroachDB
- [ ] **Total, causal and FIFO ordering**
- [ ] **The FLP impossibility result**
- [ ] **CAP theorem**
- [ ] **PACELC**
- [ ] **Consistency models** (linearisable, sequential, causal, eventual, read-your-writes)
- [ ] **Isolation levels and anomalies**
- [ ] **Idempotency**
- [ ] **End-to-end argument**

## Replication

- [ ] **Single-leader replication**
- [ ] **Multi-leader replication**
- [ ] **Leaderless replication and quorums** — wild: Cassandra, Dynamo
- [ ] **Synchronous vs asynchronous replication**
- [ ] **Replication lag and its anomalies**
- [ ] **Read repair and hinted handoff**
- [ ] **Anti-entropy with Merkle trees** — needs: Merkle tree
- [ ] **Chain replication**
- [ ] **Conflict resolution** (last write wins, siblings)
- [ ] **CRDTs** (counters, sets, registers, sequences)
- [ ] **Operational transformation**

## Partitioning

- [ ] **Range partitioning**
- [ ] **Hash partitioning**
- [ ] **Consistent hashing with virtual nodes** — needs: consistent hashing
- [ ] **Rebalancing strategies**
- [ ] **Secondary indexes across partitions**
- [ ] **Hot keys and skew**
- [ ] **Request routing**

## Consensus and coordination

- [ ] **Paxos**
- [ ] **Multi-Paxos**
- [ ] **Raft** — wild: Ratis, etcd
- [ ] **ZAB** — wild: ZooKeeper
- [ ] **Viewstamped replication**
- [ ] **Byzantine fault tolerance and PBFT**
- [ ] **Leader election**
- [ ] **Leases**
- [ ] **Fencing tokens**
- [ ] **Distributed locks** — wild: ZooKeeper recipes, Redlock debate
- [ ] **Heartbeats and failure detectors** (phi accrual) — wild: Cassandra, Pekko
- [ ] **Gossip protocols**
- [ ] **SWIM membership**
- [ ] **Split brain and quorum**

## Patterns of distributed systems (Joshi catalogue)

- [ ] **Write-ahead log**
- [ ] **Segmented log**
- [ ] **Low-water mark**
- [ ] **High-water mark**
- [ ] **Replicated log**
- [ ] **Generation clock**
- [ ] **Majority quorum**
- [ ] **Leader and followers**
- [ ] **Follower reads**
- [ ] **Versioned value**
- [ ] **Version vector**
- [ ] **Request pipeline**
- [ ] **Request batch**
- [ ] **Singular update queue**
- [ ] **Request waiting list**
- [ ] **Idempotent receiver**
- [ ] **State watch**
- [ ] **Emergent leader**
- [ ] **Consistent core**
- [ ] **Fixed partitions**
- [ ] **Key-range partitions**
- [ ] **Clock-bound wait**
- [ ] **Two-phase commit (pattern)**
- [ ] **Single-socket channel**

## Storage internals

- [ ] **Log-structured storage and compaction** — needs: LSM tree · wild: RocksDB
- [ ] **B-tree page storage** — needs: B+ tree
- [ ] **SSTables and memtables**
- [ ] **Bloom filters in storage engines** — needs: Bloom filter
- [ ] **MVCC**
- [ ] **Snapshots and checkpointing**
- [ ] **Column-oriented storage** — wild: Parquet
- [ ] **Indexes: primary, secondary, covering**
- [ ] **Page cache, fsync and durability**

## Transactions

- [ ] **ACID, properly**
- [ ] **Two-phase commit**
- [ ] **Three-phase commit**
- [ ] **Saga**
- [ ] **Try-confirm-cancel**
- [ ] **Transactional outbox**
- [ ] **Chandy-Lamport distributed snapshots**
- [ ] **Optimistic and pessimistic concurrency control**
- [ ] **Serializable snapshot isolation**
- [ ] **Percolator-style transactions**
- [ ] **TrueTime and externally consistent transactions** — wild: Spanner
- [ ] **Deterministic transactions** — wild: Calvin

## Messaging and streams

- [ ] **Delivery semantics** (at most once, at least once, exactly once)
- [ ] **Log-based message brokers** — wild: Kafka
- [ ] **Partitions, offsets and consumer groups**
- [ ] **Ordering guarantees**
- [ ] **Exactly-once processing**
- [ ] **Windowing** (tumbling, sliding, session)
- [ ] **Event time, processing time and watermarks**
- [ ] **Stream-table duality**
- [ ] **Change data capture** — wild: Debezium
- [ ] **Backpressure across services**
- [ ] **Dead letter queues and poison messages**

## Batch and data processing

- [ ] **MapReduce**
- [ ] **Dataflow model**
- [ ] **Lambda and kappa architectures**
- [ ] **Joins at scale**

## Scalability and resilience

- [ ] **Load balancing algorithms** (round robin, least connections, power of two choices)
- [ ] **Caching strategies** (cache-aside, read-through, write-through, write-behind)
- [ ] **Cache stampede and its defences**
- [ ] **Cache invalidation**
- [ ] **Rate limiting** (token bucket, leaky bucket, fixed and sliding window) — wild: Guava RateLimiter, Resilience4j
- [ ] **Load shedding and admission control**
- [ ] **Timeouts and deadlines**
- [ ] **Retries with backoff and jitter**
- [ ] **Circuit breaker** — wild: Resilience4j
- [ ] **Bulkhead**
- [ ] **Hedged requests**
- [ ] **Idempotency keys**
- [ ] **Sharding**
- [ ] **Connection pooling** — wild: HikariCP
- [ ] **Content delivery networks**
- [ ] **Queueing theory, just enough**

## Networking

- [ ] **TCP and UDP**
- [ ] **HTTP/1.1, HTTP/2 and HTTP/3**
- [ ] **TLS handshake**
- [ ] **RPC and gRPC** — wild: gRPC-Java
- [ ] **REST and API design**
- [ ] **WebSockets, server-sent events and long polling**
- [ ] **DNS**
- [ ] **Service discovery**
- [ ] **Reverse proxies and API gateways**
- [ ] **Serialisation formats** (JSON, Protobuf, Avro) — wild: Jackson
- [ ] **Schema evolution and compatibility**
- [ ] **Non-blocking I/O and the event loop** — wild: Netty

## Observability and operations

- [ ] **Logs, metrics and traces**
- [ ] **Correlation and trace identifiers**
- [ ] **SLIs, SLOs and error budgets**
- [ ] **Health checks and readiness**
- [ ] **Percentiles and coordinated omission** — wild: HdrHistogram
- [ ] **Chaos testing**
- [ ] **Deterministic simulation testing** — wild: Jepsen, FoundationDB

## Security

- [ ] **Authentication vs authorisation**
- [ ] **OAuth 2.0 and OpenID Connect**
- [ ] **JSON Web Tokens**
- [ ] **Mutual TLS**
- [ ] **Secrets management**
- [ ] **Zero trust networking**
