# Pin index digests so rebuilds use the local image and do not contact
# Docker Hub to resolve a floating tag (fails under campus TLS intercept
# or Clash TUN). Bump the digest when intentionally moving the base.
FROM maven:3.9.11-eclipse-temurin-21@sha256:6fdc855a6ed81d288ca7ca37ac6ff5e9308b612485c0801d70b25a858c83d237 AS build
WORKDIR /workspace
COPY services/api/pom.xml pom.xml
RUN mvn --batch-mode -q -DskipTests dependency:go-offline
COPY services/api/src src
RUN mvn --batch-mode -q -DskipTests package

FROM eclipse-temurin:21-jre@sha256:7a65df4b22d2de92d4e04056e884f3b9122d70b21e2847fd66084278bd0ce037
# curl is already in this JRE image; do not apt-get (Debian updates EOF
# through Clash fake-ip and similar restricted paths).
RUN useradd --create-home --uid 10001 appuser
WORKDIR /app
COPY --from=build /workspace/target/yukcsca-api-*.jar app.jar
USER appuser
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=6 \
  CMD curl --fail --silent http://localhost:8080/actuator/health/readiness || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
