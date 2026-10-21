# NEON TETRIS

A production-grade Tetris clone with a neon/cyber arcade aesthetic, built with
**Next.js 15 (App Router) · TypeScript (strict) · Phaser 3 · Zustand · TailwindCSS 4 · shadcn/ui**.

![stack](https://img.shields.io/badge/Next.js-15-black) ![stack](https://img.shields.io/badge/Phaser-3.90-blue) ![stack](https://img.shields.io/badge/Zustand-5-purple) ![stack](https://img.shields.io/badge/TS-strict-blue)

## Features

- Classic 10×20 board with 2 hidden spawn rows
- All 7 tetrominoes with the **SRS rotation system** (full JLSTZ + I wall-kick tables)
- **7-bag randomizer**, ghost piece, hold slot, 5-piece next queue
- Guideline scoring: singles→Tetris, **T-spins** (3-corner rule, mini detection),
  back-to-back ×1.5, combos, soft/hard-drop points
- Guideline gravity curve with lock delay (500 ms, 15 move-resets) and increasing speed
- DAS/ARR keyboard handling, plus mobile support: swipe gestures and on-screen controls
- Synthesized **chiptune sound effects + music** via the Web Audio API (zero audio assets)
- Local top-10 high scores persisted in `localStorage`
- Glassmorphism UI, neon glow, dark mode, smooth animations (line-clear flash,
  hard-drop trails, particles, score popups, count-up HUD)
- 60 FPS rendering: dirty-flag board redraws, effect objects pooled/destroyed per event

## Playtest quality gates

```bash
npm run lint        # ESLint (no-explicit-any enforced)
npm run typecheck   # tsc --noEmit with strict + noUncheckedIndexedAccess
npm test            # 38 Vitest unit tests for the pure game engine
npm run smoke       # headless-Chrome E2E: start, move, hold, pause, game over, restart
npm run build       # production build (Phaser is code-split out of the initial bundle)
```

## Controls

| Key | Action |
| --- | --- |
| ← / → | Move (DAS/ARR repeat) |
| ↓ | Soft drop |
| Space | Hard drop |
| ↑ / X | Rotate clockwise |
| Z / Ctrl | Rotate counter-clockwise |
| C / Shift | Hold |
| P / Esc | Pause |
| R | Restart |
| M | Mute |

Mobile: swipe left/right to move, drag down to soft drop, flick down to hard drop,
tap to rotate — or use the on-screen button pad.

## Architecture

Game rules are completely decoupled from rendering and UI:

```
src/
├── game/
│   ├── engine/            # Pure TypeScript rules engine — no Phaser, no React, no DOM
│   │   ├── types.ts       # Domain types (pieces, events, config)
│   │   ├── tetrominoes.ts # SRS shapes, palette, box-rotation math
│   │   ├── srs.ts         # Wall-kick tables (JLSTZ + I)
│   │   ├── board.ts       # Collision, locking, line clearing
│   │   ├── bag.ts         # 7-bag randomizer (injectable RNG)
│   │   ├── scoring.ts     # Guideline scoring incl. T-spins/B2B/combos
│   │   ├── gravity.ts     # Level curve + level-up math
│   │   ├── gameEngine.ts  # State machine, tick loop, typed event emitter
│   │   └── *.test.ts      # Vitest suites (38 tests)
│   ├── phaser/
│   │   ├── PlayfieldScene.ts  # Visuals only: board, ghost, FX, gestures
│   │   ├── GameController.ts  # Input (DAS/ARR, gestures) + event routing
│   │   ├── controllerRef.ts   # Command bridge for React components
│   │   └── constants.ts       # Layout/palette constants
│   └── audio/             # Web Audio chiptune synth (SFX + music loop)
├── store/                 # Zustand: game state, settings, high scores (persisted)
├── components/game/       # React UI: HUD, previews, overlays, touch controls
└── app/                   # Next.js App Router shell (dark-only, fonts, metadata)
```

Data flow:

```
keyboard/gestures ─▶ GameController ─▶ GameEngine.tick()/commands
                          │                  │ typed events
                          ▼                  ▼
                    Phaser scene ◀────── Zustand stores ──▶ React HUD
                    (per-frame FX)      (discrete events)
```

React never re-renders per frame: the Phaser canvas owns the 60 FPS loop and the
stores update only on discrete engine events (lock, clear, level-up, …).

## CI/CD (GitHub Actions)

Three workflows live in `.github/workflows/`:

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `02-ci.yml` | `push` (any branch) + `pull_request` + manual | Checkout → Node.js → `npm ci` → `npm test` → `typecheck` → `lint` → `npm run build`, on a matrix of Node 20/22. Uploads the build as an artifact. |
| `03-cd.yml` | `push` to `main` + manual | Rebuilds with the tests as a gate, publishes the artifact, and deploys to Vercel when the deployment secrets are configured. |
| `04-docker.yml` | `push` to `main` + `v*` tags + manual | Builds the multi-stage `Dockerfile` and publishes the image to GitHub Container Registry with BuildKit cache. |

Every workflow follows the same shape:

```
push / pull_request
   └─ checkout          (actions/checkout@v4)
      └─ setup-node     (actions/setup-node@v4, cache de npm)
         └─ npm ci      (instalación reproducible desde package-lock.json)
            ├─ npm test           (Vitest — puerta de calidad)
            ├─ npm run typecheck  (tsc --noEmit, strict)
            ├─ npm run lint       (ESLint flat config)
            └─ npm run build      (next build --turbopack)
```

Good practices applied:

- **`npm ci` instead of `npm install`** — installs exactly what `package-lock.json`
  pins and fails if the manifest and the lock file drift apart.
- **npm cache** (`cache: npm` in `setup-node`) — the download of dependencies is
  cached between runs and invalidated only when the lock file changes.
- **Matrix de versiones de Node** with `fail-fast: false` — a failure in one
  version does not hide the result of the other.
- **`concurrency`** — a new push cancels the in-flight CI run of the same branch
  (CD does *not* cancel, to avoid two deployments in production at once).
- **Least-privilege permissions** — `contents: read` by default; `packages: write`
  only in the image-publishing workflow.
- **Deploy gated by an environment** — the `production` environment in GitHub
  can require manual approval before the deploy job runs.
- **Artefactos del build** — `upload-artifact@v4` excluye los archivos ocultos
  por defecto (cambio incompatible en **v4.4.0**), y `.next` es un directorio
  oculto. Sin `include-hidden-files: true` el artefacto se sube vacío y el
  paso falla con *"No files were found with the provided path"*. Además se
  excluye `.next/cache` (caché de build, no hace falta en el artefacto).
- **`public/` versionado con `.gitkeep`** — git no guarda directorios vacíos.
  Sin ese archivo, `public/` no existe tras un `clone` limpio y el
  `COPY --from=builder /app/public` del `Dockerfile` rompe la imagen.

### Configuration for the automatic deploy (optional)

The `deploy` job of `03-cd.yml` is skipped unless the repository variable
`VERCEL_ENABLED` is set to `true`. To enable it:

1. Create the project in Vercel and link it to this repository.
2. Add the **secrets** (Settings → Secrets and variables → Actions):
   `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
3. Add the **repository variable** `VERCEL_ENABLED` = `true`.

### Branch protection (recommended)

In Settings → Branches → `main`, require the `CI / Validar (Node 22.x)` status
check before merging, so no change reaches `main` without passing tests and build.

## Deploy on Vercel

No configuration needed — the default Next.js output works as-is:

```bash
npm i -g vercel
vercel        # or connect the repo in the Vercel dashboard
```

Phaser is loaded client-side only (`next/dynamic` with `ssr: false`), so the
page prerenders statically and the heavy renderer arrives as a lazy chunk.

Alternatively, run it with Docker:

```bash
docker build -t neon-tetris .
docker run --rm -p 3000:3000 neon-tetris   # http://localhost:3000
```

## Local development

```bash
npm install
npm run dev     # http://localhost:3000
```
