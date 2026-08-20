---
trigger: always_on
---

# Global Rules — React Projects

A website that manage video, events from AI

---

## Language & Communication

- Respond in **Vietnamese** by default unless the user writes in another language.
- Keep explanations concise. Prefer code over prose.

---

## Tech Stack Defaults

- **Framework**: React 19 with Vite
- **Language**: TypeScript (strict mode)
- **Styling**: MUI
- **State**: Context from React
- **Data fetching**: TanStack Query (React Query v5)
- **Routing**: Tanstack router
- **Forms**: React Hook Form + Zod
- **Testing**: Vitest + React Testing Library

---

## Component Rules

- Use **function components** exclusively — no class components.
- Every component must define a TypeScript or type (don't use inteface) for its props.
- Co-locate component, styles, and tests in the same folder:
  ```
  components/
  └── Button/
      ├── Button.tsx
      ├── Button.test.tsx
      └── index.ts        ← re-export only
  ```
- Export components as named exports; use `index.ts` for the public API.
- Never export business logic from a component file — put it in a hook or util.

---

## TypeScript Rules

- `strict: true` always enabled.
- No `any` — use `unknown` and narrow with type guards.
- Only use type, don't use interface
- Never use non-null assertion (`!`) — handle `null` / `undefined` explicitly.

---

## Hooks

- Prefix every custom hook with `use`.
- One concern per hook — keep hooks small and composable.
- Memoize with `useMemo` / `useCallback` only when there is a measured performance problem, not pre-emptively.

---

## File & Folder Structure

```
src/
├── assets/           # images, fonts, icons
├── components/       # shared, reusable UI components
├── routes/           # route-level components (thin shells, delegate to features)
│   └── auth/
│       ├── components/
│       ├── hooks/
│       └── api.ts
├── hooks/            # global custom hooks
├── lib/              # third-party wrappers & singletons (axios instance, queryClient…)
├── store/            # Zustand slices
├── types/            # shared TypeScript types
└── utils/            # pure helper functions
```

---

## Code Style

- Max 80 characters per line; break JSX onto multiple lines when props exceed this.
- Alphabetize imports in three groups: external → internal → relative.
- No unused imports, variables, or exports (`noUnusedLocals: true`).
- Prefer `const` over `let`; never use `var`.
- Use optional chaining (`?.`) and nullish coalescing (`??`) over verbose conditionals.

---

## API & Data Fetching

- All API calls live in `features/<name>/api.ts` or `lib/api/`.
- Always type request and response shapes with Zod schemas and infer TypeScript types from them.
- Never `fetch` directly inside a component — use a TanStack Query hook.
- Handle loading, error, and empty states explicitly in every data-driven component.

---

## What to Avoid

- `create-react-app` — use Vite instead.
- `defaultProps` — use default parameter values in function signatures.
- `PropTypes` — TypeScript handles this.
- `moment.js` — use `dayjs`.
- Barrel files with circular dependencies.
- Re-inventing utilities already in the stack (lodash, date-fns, etc.).

---

## Agent Behaviour

- **Always plan before coding.** For tasks spanning more than one file, output an Implementation Plan artifact first and wait for approval.
- Ask one clarifying question maximum before starting; don't ask for information you can infer from context.
- After completing a task, summarise what changed, what was not changed, and any follow-up recommendations.
- When fixing a bug, explain the root cause in one sentence before showing the fix.
