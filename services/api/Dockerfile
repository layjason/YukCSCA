FROM maven:3.9.15-eclipse-temurin-26 AS build
WORKDIR /workspace
COPY services/api/pom.xml pom.xml
RUN mvn --batch-mode -q -DskipTests dependency:go-offline
COPY services/api/src src
RUN mvn --batch-mode -q -DskipTests package

FROM eclipse-temurin:21-jre
RUN apt-get update \
    && apt-get install --yes --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 appuser
WORKDIR /app
COPY --from=build /workspace/target/yukcsca-api-*.jar app.jar
USER appuser
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=6 \
  CMD curl --fail --silent http://localhost:8080/actuator/health/readiness || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
