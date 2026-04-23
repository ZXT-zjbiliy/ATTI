# Adapters Module

This directory is reserved for site adapter abstractions and implementations.

Subdirectories:

- `base/`: shared adapter contracts
- `registry/`: adapter lookup, registration catalog, and resolution
- `sites/`: one site family per adapter implementation

All site-specific behavior must stay here.

Registration rules:

- each supported site family keeps its own adapter module under `sites/`
- the registry must consume adapters through the explicit catalog under `registry/`
- do not combine multiple unrelated sites into one adapter file
- do not move site selectors or DOM heuristics into content, background, or provider modules
