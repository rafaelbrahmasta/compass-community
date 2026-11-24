# Stage 1: Build binary
FROM rust:1.82-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations

RUN cargo build --release

# Stage 2: Runtime
FROM debian:bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

# Hardening: Buat user non-root appuser
RUN groupadd -g 10001 appuser && \
    useradd -u 10001 -g appuser -m -s /bin/bash appuser

COPY --from=builder /app/target/release/compass-backend /app/compass-backend
COPY --from=builder /app/migrations /app/migrations

RUN mkdir -p /app/uploads/gallery /app/uploads/news /app/uploads/merch /app/uploads/qr /app/uploads/proof \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8080

CMD ["/app/compass-backend"]
