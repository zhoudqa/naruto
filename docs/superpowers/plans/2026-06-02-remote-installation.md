# Remote npm Installation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish Naruto to npm as `@zhoudqa/naruto` so users can install it with a single `bun add` command.

**Architecture:** Three changes: (1) update `package.json` with npm-publishing metadata and scripts, (2) add a GitHub Actions workflow that auto-publishes on `v*` tags, (3) update `README.md` with simplified install instructions.

**Tech Stack:** npm, GitHub Actions, Bun

---

### Task 1: Configure package.json for npm publishing

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Read the current package.json**

Run: `cat package.json` to see current state.

- [ ] **Step 2: Apply all package.json changes**

Edit `package.json`:

- `"name"`: `"@zhoudqa/naruto"`
- Add `"publishConfig": { "access": "public" }`
- Change `"files"` to `["dist"]`
- Add to `"scripts"`:
  - `"prepublishOnly": "bun run build"`
  - `"prepack": "bun run build"`
- Add `"repository"`:
  ```json
  "repository": {
    "type": "git",
    "url": "git+https://github.com/zhoudqa/naruto.git"
  },
  "homepage": "https://github.com/zhoudqa/naruto#readme",
  "bugs": {
    "url": "https://github.com/zhoudqa/naruto/issues"
  }
  ```

- [ ] **Step 3: Verify the file is valid JSON**

Run: `bun run typecheck`
Expected: TypeScript compiles without errors.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: configure package.json for npm publishing"
```

---

### Task 2: Create GitHub Actions publish workflow

**Files:**
- Create: `.github/workflows/publish.yml`

- [ ] **Step 1: Check directory exists**

Run: `mkdir -p .github/workflows`

- [ ] **Step 2: Create publish.yml**

Write `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - run: bun install --frozen-lockfile

      - run: bun run build

      - run: bun test

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'

      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/publish.yml
git commit -m "ci: add GitHub Actions workflow for npm publish on tag"
```

---

### Task 3: Update README.md with simplified installation instructions

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read current README.md**

Run: `cat README.md` to see the installation section.

- [ ] **Step 2: Update the Installation section**

Replace the current multi-step install section with:

```markdown
## 安装

### 前提条件

- [OpenCode](https://opencode.ai) 已安装并配置
- [Bun](https://bun.sh) 运行时（推荐 1.3+）

### 远程安装（推荐）

```bash
bun add @zhoudqa/naruto
```

然后在 OpenCode 配置（`~/.config/opencode/config.json` 或项目 `.opencode/config.json`）中添加：

```json
"plugin": ["@zhoudqa/naruto"]
```

### 本地开发

如需修改 Naruto 源码，请使用以下方式：

```bash
git clone git@github.com:zhoudqa/naruto.git
cd naruto
bun install
bun run build
```

然后在 OpenCode 配置中将插件路径指向本地构建产物：

```json
"plugin": ["./naruto/dist/index.js"]
```

### 发布新版本

```bash
npm version patch   # 小改版：0.1.0 → 0.1.1
npm version minor   # 功能新增：0.1.0 → 0.2.0
npm version major   # 大版本：0.1.0 → 1.0.0
git push --follow-tags
```

推送 tag 后，GitHub Actions 会自动构建并发布到 npm。
```

Also update the `## 快速开始` section to reference the new install method if it mentions cloning.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: simplify installation instructions for npm publishing"
```
