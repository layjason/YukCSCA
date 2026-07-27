# API agent rules

- Java 21, Spring Boot 4, Maven, PostgreSQL, and Flyway are fixed unless an ADR changes them.
- Use `./mvnw` for developer and CI host commands. The API Dockerfile may use its pinned Maven build image when its Maven and Java versions match the wrapper and project toolchain.
- Follow module packages: `api`, `application`, `domain`, `infrastructure`.
- Controllers translate HTTP only. Transactions and decisions belong in application services.
- JPA entities never cross the API boundary. Return records/DTOs.
- Use UUID identifiers and UTC timestamps.
- Repositories are module-internal. Cross-module access uses an application-facing port/API.
- Use PostgreSQL through Testcontainers for integration tests; never add H2.
- Every endpoint must have validation, authentication/authorization posture, problem response, and tests.
- Never edit an applied Flyway migration.
- External calls require timeout, bounded retry, metrics, and an adapter interface.

- The backend agent owns the `VS-NNN` and TypeSpec lifecycle. It must resolve or escalate frontend contract requests in the slice and must not treat contract ownership as product authority.
