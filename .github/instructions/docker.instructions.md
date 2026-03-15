---
applyTo: "**/Dockerfile*"
---
# Dockerfile Guidelines

- Use multi-stage builds to minimize image size
- Pin base images to specific digest or version tag
- Use `COPY` over `ADD` unless extracting archives
- Run as non-root user (`USER 1001`)
- Use `.dockerignore` to exclude dev files
- Order layers from least to most frequently changing
- Use `HEALTHCHECK` instruction for service containers
- Combine `RUN` commands to reduce layers
- Don't store secrets in image layers
