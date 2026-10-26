# Changesets

Each file in this folder describes a pending release: which packages change and how (patch, minor, major).

- `pnpm changeset` adds one.
- `pnpm version-packages` applies them: bumps versions and writes `CHANGELOG.md`.
- `pnpm release` builds and publishes to npm.

All packages share one version (see `fixed` in `config.json`).
