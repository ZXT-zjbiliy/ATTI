# Source Layout

This directory contains the implementation source tree for ATTI.

Top-level responsibilities:

- `app/`: extension UI entrypoints and UI-only components
- `background/`: background runtime, routing, orchestration
- `content/`: content-script runtime only
- `adapters/`: site adapter interfaces, registry, site-specific adapters
- `domain/`: domain-focused business contracts and logic boundaries
- `llm/`: model providers, prompts, response parsing
- `storage/`: persistence layer and repositories
- `shared/`: shared types, schemas, and cross-runtime utilities

This skeleton is intentionally modular and should not be collapsed into a single large file.
