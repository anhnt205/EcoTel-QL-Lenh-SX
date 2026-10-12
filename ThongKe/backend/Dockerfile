FROM maven:3.9.8-eclipse-temurin-21 AS builder
WORKDIR /app

# Nếu có settings.xml (private repo) thì thêm
# COPY settings.xml /root/.m2/settings.xml

# Copy pom trước để cache dependency
COPY pom.xml .

# Cache dependency
RUN mvn -B dependency:go-offline

# Build project
COPY src ./src
RUN mvn -B package -DskipTests

############################
# Stage 2 — Runtime
############################
FROM eclipse-temurin:21-jre-alpine

RUN apk add --no-cache curl
RUN addgroup -S spring && adduser -S spring -G spring

WORKDIR /app

COPY --from=builder /app/target/*.jar app.jar

RUN chown -R spring:spring /app
USER spring

EXPOSE 8088

HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8088/actuator/health || exit 1

ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]