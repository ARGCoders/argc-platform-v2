# PocketBase as a deployable service.
#
# The previous instance was created by hand in the Railway dashboard, so nothing
# in git described it — when the service was deleted there was no way to
# recreate it. This file exists so the backend is reproducible.
#
# Keep PB_VERSION in step with PB_VERSION in the Makefile, so local development
# and production run the same build.

FROM alpine:3.20

ARG PB_VERSION=0.30.0

# Supplied automatically by the builder — amd64 on Railway, arm64 when someone
# runs `make pb-image` on an Apple Silicon Mac. Hardcoding amd64 produced an
# image that built fine and then died with "exec format error" on arm.
ARG TARGETARCH

RUN apk add --no-cache ca-certificates unzip wget

RUN ARCH="${TARGETARCH:-amd64}" \
 && wget -q -O /tmp/pb.zip \
      "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${ARCH}.zip" \
 && unzip -q /tmp/pb.zip -d /usr/local/bin pocketbase \
 && chmod +x /usr/local/bin/pocketbase \
 && rm /tmp/pb.zip

# Mount a Railway volume here. Without one the database is wiped on every
# deploy — this is the single most important part of the setup.
VOLUME /pb_data

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Railway injects PORT; 8090 is the fallback for a plain `docker run`.
ENV PORT=8090
EXPOSE 8090

ENTRYPOINT ["/entrypoint.sh"]
