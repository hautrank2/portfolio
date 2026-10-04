---
trigger: always_on
---

# Global Rules — Portfolio & Learning Blog

Personal portfolio for Hậu Trần. Four parts share one Next.js app:

- **Public site** — home, about, showcase, CV / resume.
- **Blog** — learning notes that grow into per-topic roadmaps. Kubernetes is
  live; Three.js exists but is hidden with `draft: true`.
- **Recipes** — a flat shelf of food and coffee notes.
- **Admin** — a private, signed-in area (`/admin`) for the owner's work log.
  It is the only part backed by a database.

---

## Language & Communication

- Respond in **Vietnamese** by default unless the user writes in another language.
- Keep explanations concise. Prefer code over prose.
- Report what changed, what did not, and follow-ups. Say when something is
  unverified rather than implying it works.

---

## Tech Stack

| | |
| --- | --- |
| Framework | **Next.js 16** — App Router, RSC by default, Turbopack |
| Language | TypeScript 6, `strict: true` |
| UI | React 19 |
| Styling | **Tailwind CSS v4** — CSS-first config in `src/app/globals.css` |
| Components | **shadcn/ui** (`new-york`), Radix primitives, `lucide-react` icons |
| Theme | `next-themes` — class on `<html>`, dark by default, toggle in the header |
| Content | Markdown files in `content/` (blog, recipes), no CMS |
| Markdown | `unified` — remark to rehype to **React elements** (`src/components/blog/markdown.tsx`) |
| Database | **MongoDB** via the official `mongodb` driver — admin area only |
| Auth | `jose` (HS256 JWT in an httpOnly cookie) + `bcryptjs` |
| Forms & validation | `react-hook-form` + `zod` |
| Package manager | **pnpm** |
| Tests | none configured — do not invent a test command |

There is no Vite, no MUI, no TanStack, no Zustand, no ORM.

Two halves with different rules:

- **Public pages are static**, generated from files on disk. They never touch
  the database and never fetch on the client. Keep it that way — a blog page
  that needs MongoDB to render is a regression.
- **`/admin` and `/api` are dynamic.** Route handlers under `src/app/api/` read
  and write MongoDB; admin components call them with `fetch` from their
  `hook.ts`. See *Admin, Auth & Database* below.

---

## Source Code Rules

Coding conventions live in their own files. Read them before writing code:

| File | Covers |
| --- | --- |
| `source-code-rule.md` | TypeScript, code style, file naming, components, hooks, the UI library, Tailwind |
| `complex-component-rule.md` | the `index.tsx` / `hook.ts` / `type.ts` component split |
| `dialog-form-rule.md` | forms inside a dialog |

This file covers the project itself: what it is, content, admin, structure and
how to verify.

---

## Content & the Blog

- Notes are `.md` files under `content/blog/<topic>/…`, nested to any depth.
- Ordering comes from the `order:` array in each folder's `index.md`, never from
  filenames or a numeric frontmatter field. Reordering means moving a line.
- An `order:` entry with no file behind it renders as a greyed **planned** node.
  That is the backlog, and it is intentional.
- File names are ASCII slugs; the Vietnamese title lives in frontmatter. The
  build runs on Linux and is case-sensitive — never rely on Windows casing.
- `draft: true` keeps a note out of the build entirely.
- Routing is one catch-all, `src/app/blog/[...slug]/page.tsx`. Adding a note
  never means adding a route file.
- Document titles are path-style with a fixed prefix: `htk2 | blog | k8s`. The
  prefix comes from `titlePrefixData` in `src/data/site.ts` via the root
  layout's `title.template` — pages only declare the part after it.
- A new top-level track is a new folder plus a line in `content/blog/index.md`.
  Its logo is optional and lives in `trackLogoData` (`src/data/blog.ts`).

### Writing notes

- Notes are written in Vietnamese, but **technical terms stay in English**:
  object, manifest, Pod, Deployment, Service, volume, mount target, rollout.
  Do not coin Vietnamese replacements ("bản khai" for a Kubernetes object) —
  the reader will meet the English word in `kubectl` output and in the docs.
- Use one term for one thing across a track. In the k8s notes, *object* is a
  thing that exists in the cluster and *manifest* is the YAML file that
  declares it; do not swap them.
- Commands in a note must be ones that were actually run. When a step has a
  wait between two commands (a rollout, a deletion), say so or add the wait.

### Downloadable exercise code

- Source for a note's exercise is a **folder** under `public/code/<name>/`.
- `/code/<name>.zip` is built on demand by `src/app/code/[slug]/route.ts`.
  Never commit a `.zip` beside the folder — a stale one would be served first.

### Recipes

- Recipes are `.md` files in `content/recipes/`, loaded by `src/lib/recipes.ts`.
- They are a flat shelf, deliberately separate from the blog loader: no
  `order:`, no planned nodes, no nesting. Do not merge the two loaders.

---

## Admin, Auth & Database

The admin area is small and private. Its rules exist to keep secrets and the
database out of everything else.

- **One way into MongoDB:** `getDb()` from `~/lib/db`. It caches the client on
  `globalThis`; never call `new MongoClient` anywhere else in `src/`.
- **Data access lives in `src/lib/<feature>.ts`** (`worklog.ts`), next to its
  `zod` schemas. Route handlers stay thin: check the session, validate, call
  the lib function, return JSON.
- **There is no middleware.** Every admin page and every `/api` handler checks
  `getSession()` from `~/lib/auth` itself — pages `redirect("/admin/login")`,
  handlers return `401`. A new handler without that check is public.
- **Validate every request body** with a `zod` schema via `safeParse`; read the
  body as `unknown`. Reject with `400`, never let a bad shape reach the driver.
- **Documents never leave the lib.** Map them to a `…Model` first: `_id`
  becomes a string `id`, `Date` becomes an ISO string.
- **Server only.** `~/lib/db`, `~/lib/auth` and anything importing `mongodb`
  must not be imported from a Client Component.
- Admin routes are `noindex` through `src/app/admin/layout.tsx`.
- `PUT /api/cv` writes `src/data/cv.json` and answers `404` outside
  development on purpose — the CV is published through git, not at runtime.

### Environment

| Variable | Used by | Notes |
| --- | --- | --- |
| `MONGODB_URI` | `lib/db.ts`, seed script | required for admin |
| `MONGODB_DB` | `lib/db.ts`, seed script | optional, defaults to `portfolio` |
| `AUTH_SECRET` | `lib/auth.ts` | at least 32 characters |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | `scripts/seed-admin.mjs` only | never read by the app |

- `.env*` is gitignored. Never commit a secret, print one, or paste one into a
  note. Only the bcrypt hash of the admin password is stored.
- `pnpm seed:admin` creates the admin user (or resets its password) and the
  indexes.
- The public site must still build and run with none of these set.

---

## Folder Structure

```
content/
├── blog/              # markdown notes — the blog's source of truth
└── recipes/           # flat shelf of recipe notes
public/                # static assets served as-is (never put drafts here)
└── code/<name>/       # exercise source, zipped on demand at /code/<name>.zip
scripts/               # one-off Node scripts (seed-admin.mjs)
src/
├── app/               # App Router: routes, layouts, globals.css
│   ├── _components/   # sections used only by the home page
│   ├── <route>/_components/  # components used only by that route
│   ├── admin/         # signed-in area: login, logtime
│   ├── api/           # route handlers: auth, worklogs, cv
│   └── code/[slug]/   # builds the exercise zip
├── assets/fonts/
├── components/        # only what more than one route uses
│   ├── ui/            # shadcn primitives + registry components
│   ├── ai/            # AI-registry blocks
│   ├── kibo-ui/       # Kibo UI registry blocks
│   ├── blog/          # markdown pipeline
│   ├── cv/            # CV pieces shared by /cv and /resume
│   ├── sections/      # sections shared by several pages
│   ├── layouts/       # header, footer, theme provider + toggle
│   └── icons/
├── data/              # static site content (profile, projects, cv.json)
├── hooks/             # shared hooks + barrel (useXxx.ts)
├── lib/               # content loaders, db, auth, worklog, cn()
├── styles/
├── types/             # shared types + barrel
└── utils/
```

---

## Verification

Run these before claiming a task is done. All three must pass.

```bash
npx tsc --noEmit
pnpm lint
pnpm build
```

`pnpm build` type-checks every file under `src/`, so a broken component that
nothing imports still fails the build. Never report success without running it.

For anything visible in the browser, verify in the preview and say what you
observed — do not ask the user to check manually. Check light and dark.

The dev server runs on port **8080** (`pnpm dev`). Admin and `/api` changes
need a reachable MongoDB and the variables above; if they are not available,
say the change is unverified instead of guessing.

---

## What to Avoid

- Adding a route file per note — the catch-all already handles any depth.
- `dangerouslySetInnerHTML` for markdown — the pipeline returns React elements.
- Numeric prefixes or `order:` frontmatter fields for sequencing content.
- Client-side syntax highlighting anywhere in the blog.
- Putting drafts or notes in `public/` — everything there is publicly served.
- Making a public page depend on MongoDB or on a client-side fetch.
- An `/api` handler or admin page without a `getSession()` check.
- Opening a second MongoDB connection instead of using `getDb()`.
- Committing `.env*`, or a `.zip` under `public/code/`.
- Translating established technical terms in notes into Vietnamese coinages.

---

## Agent Behaviour

- For work spanning more than one file, outline the plan before editing.
- Ask at most one clarifying question; infer the rest from the codebase.
- When fixing a bug, state the root cause in one sentence before the fix.
- Prefer the smallest change that solves the problem; do not refactor adjacent
  code unasked.
