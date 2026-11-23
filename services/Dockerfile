FROM debian:bookworm-slim AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential cmake git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTING=OFF \
  && cmake --build build --target dcl-exam-engine --parallel 2

FROM debian:bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates libstdc++6 \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/build/dcl-exam-engine /usr/local/bin/dcl-exam-engine

ENV PORT=8080
EXPOSE 8080
USER 10001:10001

ENTRYPOINT ["/usr/local/bin/dcl-exam-engine"]