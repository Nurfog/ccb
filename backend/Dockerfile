# --- Builder Stage ---
# Use a specific Rust version for reproducible builds.
FROM rust:latest AS builder

# Set the working directory in the container.
WORKDIR /app

# Create a dummy project to cache dependencies.
# This layer is only rebuilt if Cargo.toml or Cargo.lock changes.
RUN mkdir -p backend/src
RUN echo "fn main() {}" > backend/src/main.rs

# Copy workspace definition files
COPY Cargo.toml ./
COPY backend/Cargo.toml ./backend/

RUN cargo fetch

# Now, copy the actual source code and the sqlx cache.
# This layer will be rebuilt on source code changes, but dependencies are already cached.
COPY backend/src ./backend/src
COPY .sqlx ./.sqlx

# Run the build and save all output to a log file.
# The `--verbose` flag is useful for debugging.
RUN SQLX_OFFLINE=true cargo build --release --workspace --verbose 2>&1 | tee /app/build.log

# Check the build output: list the release dir, then check for the binary.
# If either fails, print the build log and exit.
RUN test -f /app/target/release/backend || \
    (echo "--- BUILD FAILED, LOG: ---" && cat /app/build.log && exit 1)

# --- Final Stage ---
# Use a smaller, more secure base image.
# Using bookworm (Debian 12) as it is the current stable release.
FROM debian:bookworm-slim

# Install necessary runtime libraries (like OpenSSL).
RUN apt-get update && apt-get install -y libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy the compiled binary from the builder stage.
COPY --from=builder /app/target/release/backend /usr/local/bin/

# Set the command to run the application.
CMD ["/usr/local/bin/backend"]
