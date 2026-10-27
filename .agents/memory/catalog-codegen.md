---
name: Catalog-aware code generation
description: Dependency-version detection limitations in API generation with pnpm catalogs.
---

Set the intended React Query major explicitly in Orval rather than relying on automatic detection when dependencies use pnpm catalogs.

**Why:** Orval's version detection does not resolve the catalog reference and defaults to React Query 4 despite the installed React Query 5 dependency. Generation can succeed while emitting the wrong option types.

**How to apply:** Preserve the explicit major during generator upgrades and verify regenerated clients with the full workspace typecheck.
