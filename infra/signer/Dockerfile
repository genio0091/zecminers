# Isolated payout signer (blueprint §10.3). Run it on its own host with no inbound ports; it only
# makes outbound connections to Postgres (and, once implemented, Zord + Zebra over the VPN).
FROM rust:1.88-slim AS build
WORKDIR /src
COPY apps/signer/Cargo.toml apps/signer/Cargo.lock* ./
COPY apps/signer/src ./src
RUN cargo build --release

FROM debian:bookworm-slim
RUN useradd --system --uid 10001 signer
COPY --from=build /src/target/release/zecminers-signer /usr/local/bin/zecminers-signer
USER signer
ENV SIGNER_MODE=dry-run
ENTRYPOINT ["zecminers-signer"]
