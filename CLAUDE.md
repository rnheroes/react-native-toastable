# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this project is

`react-native-toastable` is a zero-dependency, in-app toast/notification
component for React Native. The published package targets users who want a
queueable toast UI without pulling in `react-native-reanimated` or
`react-native-gesture-handler` — it relies only on React Native's built-in
`Animated` API and `PanResponder`.

- Package: `react-native-toastable` (npm)
- Current published version: see `package.json#version`
- Peer deps: `react`, `react-native` (no others — this is a hard requirement)
- Build tool: `react-native-builder-bob` (commonjs + module + typescript)
- Source entry: `src/index.tsx`

## Public API (do not break without a major version)

Exports from `src/index.tsx`:

- `default` — the `Toastable` component (root-level mount).
- `ToastableBody` — default body renderer, useful inside `renderContent`.
- `showToastable(params)` — enqueue and show a toast.
- `hideToastable()` — hide the currently visible toast.
- `TOASTABLE_STATUS_MAP` — default `{ success, danger, warning, info }` colours.
- Types: `ToastableProps`, `ToastableBodyProps`, `ToastableBodyParams`,
  `ToastableMessageStatus`, `StatusMap`.

The shape of `ToastableBodyParams` and `ToastableProps` is the contract; new
optional fields are fine, removing or renaming existing fields is not.

## Architecture

A single `<Toastable />` is mounted at the app root. `showToastable(...)`
pushes a payload onto a module-level queue and asks the mounted component
(via a ref) to display the next item. When a toast hides (timer, swipe, or
manual `hideToastable()`), the queue advances.

Key concerns to preserve through any refactor:

- **Zero new runtime deps.** No `reanimated`, no `gesture-handler`. Use
  `Animated` + `PanResponder` only.
- **One instance, queued playback.** Multiple `showToastable` calls in quick
  succession must play one after the other, not overlap.
- **Swipe to dismiss** in any subset of `up`/`left`/`right` (and `down` if the
  user opts in). Incomplete swipes must spring back to rest, not stay stuck.
- **Auto-hide timer** must start *after* the entry animation completes, so a
  short `duration` doesn't get eaten by the slide-in.
- **Native driver** for `transform` animations. Falling back to JS-driven
  layout (`left`/`top`) costs frames.
- **`renderContent`** lets users fully replace the body; `ToastableBody` is
  exported so they can compose around the default.

## Commands

From the repo root (Node 16+):

```
yarn install        # bootstrap library deps
yarn bootstrap      # also installs example/ deps
yarn typecheck      # tsc --noEmit
yarn lint           # eslint **/*.{js,ts,tsx}
yarn test           # jest (uses react-native preset)
yarn prepack        # bob build → lib/{commonjs,module,typescript}
```

The example app lives under `example/` and is an Expo project. It links the
library via the parent `src/`.

## Code style

- Prettier config in `package.json` (`singleQuote`, `trailingComma: es5`,
  `tabWidth: 2`).
- ESLint extends `@react-native-community` + `prettier`.
- TypeScript `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`,
  `noUnusedParameters` — keep noise out.

## What NOT to do

- Don't add `react-native-reanimated`, `react-native-gesture-handler`, or
  any other peer/runtime dep. The library's selling point is no extra deps.
- Don't use `Animated`'s native driver with non-`transform` / non-`opacity`
  properties (it will throw).
- Don't store render-affecting state in module-level mutable variables
  inside components — it breaks across re-mounts and successive toasts.
- Don't change the exported names in `src/index.tsx`.
