# Remote npm Installation for Naruto

**Date**: 2026-06-02
**Status**: Draft
**Domain**: DevOps / Package Distribution

## Overview

Enable users to install Naruto as an OpenCode plugin via a single `bun add` command, without needing to manually clone, build, and configure. This is achieved by publishing the project to npm as `@zhoudqa/naruto`.

## Changes

### 1. package.json

| Field | New Value | Purpose |
|-------|-----------|---------|
| `name` | `@zhoudqa/naruto` | Scoped npm package name |
| `publishConfig.access` | `"public"` | Required for scoped packages to be public by default |
| `files` | `["dist"]` | Only ship compiled output, no source code |
| `repository` | `{ type: "git", url: "git+https://github.com/zhoudqa/naruto.git" }` | Point to GitHub |
| `homepage` | `https://github.com/zhoudqa/naruto#readme` | Easy discovery |
| `bugs.url` | `https://github.com/zhoudqa/naruto/issues` | Issue reporting |
| `scripts.prepublishOnly` | `bun run build` | Auto-build before publish |
| `scripts.prepack` | `bun run build` | Auto-build before pack |

### 2. GitHub Actions — `.github/workflows/publish.yml`

Triggers on tag push matching `v*`. Steps:

1. `actions/checkout@v4`
2. `oven-sh/setup-bun@v2` with `bun-version: latest`
3. `bun install --frozen-lockfile`
4. `bun run build`
5. `bun test`
6. `actions/setup-node@v4` with `registry-url: https://registry.npmjs.org`
7. `npm publish` (uses `NODE_AUTH_TOKEN` from GitHub Secrets)

### 3. README Update

- Replace the current multi-step clone/install/build instructions with a concise `bun add @zhoudqa/naruto` section
- Document how to configure OpenCode: `"plugin": ["@zhoudqa/naruto"]`
- Keep local development instructions as a secondary section
- Add a "Publishing a new version" section with the `npm version` + `git push --follow-tags` workflow

### 4. Pre-requisites (one-time setup)

- npm token (Granular Access Token with Read and write on `@zhoudqa` scope)
- Token stored as `NPM_TOKEN` in GitHub repository secrets

## Limiting `files` to `dist/`

The `package.json` `"files"` field whitelists only `dist/` for publication. npm automatically excludes:
- `node_modules/`
- `.git/`
- `.naruto/` (already in `.gitignore`, also auto-excluded)
- Any file in `.npmignore` if present

## Release workflow

```bash
# Bump version
npm version patch    # 0.1.0 → 0.1.1
npm version minor    # 0.1.0 → 0.2.0
npm version major    # 0.1.0 → 1.0.0

# Push tag to trigger CI publish
git push --follow-tags
```

## Non-goals

- Automated semantic-release (too complex for current needs)
- Publish on every main branch push (risk of accidental publish)
- Native OpenCode registry integration (not available yet)

## Success Criteria

1. `bun add @zhoudqa/naruto` installs without errors
2. OpenCode loads the plugin from npm with `"plugin": ["@zhoudqa/naruto"]`
3. CI auto-publishes when a `v*` tag is pushed
4. All existing tests pass
