# Microservices patterns

Mostly from Chris Richardson's catalogue at microservices.io, with the cloud design patterns that sit beside it.

## Decomposition

- [ ] **Decompose by business capability**
- [ ] **Decompose by subdomain** — needs: bounded context
- [ ] **Self-contained service**
- [ ] **Service per team**
- [ ] **Strangler fig**
- [ ] **Anti-corruption layer**
- [ ] **Monolith first, and when to split**

## Data management

- [ ] **Database per service**
- [ ] **Shared database**
- [ ] **Saga: choreography**
- [ ] **Saga: orchestration**
- [ ] **API composition**
- [ ] **CQRS** — wild: Axon
- [ ] **Event sourcing** — wild: Axon
- [ ] **Domain event**
- [ ] **Transactional outbox**
- [ ] **Transaction log tailing** — wild: Debezium
- [ ] **Polling publisher**
- [ ] **Materialised view**

## Communication

- [ ] **Remote procedure invocation**
- [ ] **Messaging**
- [ ] **Domain-specific protocol**
- [ ] **API gateway** — wild: Spring Cloud Gateway
- [ ] **Backend for frontend**
- [ ] **Idempotent consumer**
- [ ] **Consumer-side and server-side discovery**
- [ ] **Service registry**
- [ ] **Self registration and third-party registration**

## Reliability

- [ ] **Circuit breaker** — wild: Resilience4j
- [ ] **Bulkhead**
- [ ] **Retry**
- [ ] **Timeout**
- [ ] **Fallback**
- [ ] **Rate limiter**
- [ ] **Compensating transaction**

## Deployment

- [ ] **Service instance per container**
- [ ] **Service instance per VM**
- [ ] **Serverless deployment**
- [ ] **Sidecar**
- [ ] **Ambassador**
- [ ] **Service mesh**
- [ ] **Blue-green deployment**
- [ ] **Canary release**
- [ ] **Feature flags**

## Cross-cutting concerns

- [ ] **Externalised configuration**
- [ ] **Microservice chassis**
- [ ] **Service template**
- [ ] **Access token**

## Observability

- [ ] **Log aggregation**
- [ ] **Application metrics** — wild: Micrometer
- [ ] **Distributed tracing** — wild: OpenTelemetry
- [ ] **Exception tracking**
- [ ] **Health check API**
- [ ] **Audit logging**
- [ ] **Log deployments and changes**

## Testing

- [ ] **Consumer-driven contract test** — wild: Pact, Spring Cloud Contract
- [ ] **Consumer-side contract test**
- [ ] **Service component test**
- [ ] **Integration tests with real dependencies** — wild: Testcontainers

## Cloud design patterns

- [ ] **Competing consumers**
- [ ] **Queue-based load levelling**
- [ ] **Priority queue**
- [ ] **Throttling**
- [ ] **Valet key**
- [ ] **Gatekeeper**
- [ ] **Leader election**
- [ ] **Scheduler-agent-supervisor**
- [ ] **Claim check**
- [ ] **Choreography**
- [ ] **Geode**
- [ ] **Deployment stamps**
- [ ] **Cache-aside**
- [ ] **Static content hosting**
