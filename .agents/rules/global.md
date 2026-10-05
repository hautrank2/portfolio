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

- Recipes are `.md` files in `content/recipes/`, loaded by `src/utils/recipes.ts`.
- They are a flat shelf, deliberately separate from the blog loader: no
  `order:`, no planned nodes, no nesting. Do not merge the two loaders.

---

## Admin, Auth & Database

The admin area is small and private. Its rules exist to keep secrets and the
database out of everything else.

- **One way into MongoDB:** `getDb()` from `~/lib/db`. It caches the client on
  `globalThis`; never call `new MongoClient` anywhere else in `src/`.
- **Data access lives in `src/lib/<feature>.ts`** (`task.ts`, `logtime.ts`,
  `label.ts`), next to its `zod` schemas. Route handlers stay thin: check the
  session, validate, call the lib function, return JSON — using `requireAdmin`
  and `readBody` from `~/utils/api`.
- **Models live in `src/types/`** (`WorkProjectModel`, `TaskModel`,
  `LogtimeModel`, `LabelModel`)
  and are the one shape shared by the lib, the handlers and the admin UI. Each
  has an `…InputModel` for what a client may send.
- **Categories and tags are one thing twice.** They share `LabelModel`,
  `lib/label.ts` and the handlers in `utils/label-routes.ts`; a `LabelKindType`
  picks the collection. Do not fork them until their shapes really diverge.
- **Relations are stored as ids** and resolved in the lib. Deleting a category
  or tag also removes the references to it.
- **Tasks and projects are never deleted.** There is no `DELETE` endpoint and
  no delete button for them; they are closed by changing their status, so the
  logtimes pointing at them keep their history. Logtimes, categories and tags
  can still be deleted.
- **Every status has one colour**, in `taskStatusColorData` and
  `workProjectStatusColorData` (`~/data/admin`), shown through `StatusSelect` /
  `StatusDot`. Do not pick a colour for a status anywhere else.
- **`lib/` is only for code that talks to something outside the app:** MongoDB
  (`db`, `task`, `logtime`, `project`, `label`) and HTTP (`api-client`).
  Everything else — content loaders, auth, schemas, date and paging helpers,
  route-handler helpers — lives in `utils/`. The one exception is
  `lib/utils.ts` (`cn`), which stays put because shadcn's CLI writes imports
  to `~/lib/utils`.
- **`localStorage` keys are declared in `localKeys`** (`~/utils/local`) and read
  and written through `readLocal` / `writeLocal`, never by a bare string.
- **Admin dates are pinned to one time zone** in `~/utils/admin-time` so the
  server and the browser agree on which day an entry belongs to.
- **Admin UI text is English.** Signed-in pages sit in `app/admin/(panel)/`,
  which provides the sidebar; its links come from `adminNavData`.
- **The whole admin UI is Client Components.** Every `page.tsx`, the
  `(panel)` layout and every `_components` file starts with `"use client"` and
  never imports a lib that touches MongoDB. The only server file under
  `app/admin/` is the root `layout.tsx`, which exports `metadata` (title and
  `noindex`) — a client file cannot. Do not add a layout just to set a title.
  The public site is the opposite — keep that RSC by default.
- **Content width is set once**, in `app/admin/(panel)/layout.tsx`. Pages and
  boards fill it; they do not set a `max-w-*` of their own.
- **`technologies` is a plain `string[]`** on tasks and logtimes. How a name
  looks (colour, logo) is client config in `src/data/technology-style.ts`; a
  name with no entry renders as plain text. Never store colour or logo in the
  database.
- **A logtime is a title, a day and a duration.** `durationMinutes` is stored
  in minutes; the form takes hours. There is no start / end time, and `note` is
  optional and usually empty.
- **Admin pages read through `useApiQuery`** (`~/hooks`) and write through
  `requestJson` (`~/lib/api-client`). After a write, `refreshApiQueries()`
  refetches what is on screen; lists with add / edit / delete get all of that
  from `useResourceDialog`.
- **Admin lists are tables paged by the API.** The page, page size and filters
  live in the URL (`?page=`, `?pageSize=`, `?status=`, `?project=`, `?month=`);
  the page reads them with `useSearchParams` + `parsePageQuery` (inside a
  `<Suspense>`), passes them on to the list endpoint and gets a `PageModel`
  back. Client code changes them through `useQueryParams`, never local state.
  A list endpoint answers with one page when `?page=` is present and with the
  whole list otherwise.
- **There is no middleware, and the UI is not the lock.** Every `/api` handler
  checks the session itself (`requireAdmin`) and returns `401`; a new handler
  without that check is public. The `(panel)` layout only hides the pages until
  `/api/auth/me` answers, and `useApiQuery` sends a `401` to the login page.
- **Validate every request body** with a `zod` schema via `safeParse`; read the
  body as `unknown`. Reject with `400`, never let a bad shape reach the driver.
- **Documents never leave the lib.** Map them to a `…Model` first: `_id`
  becomes a string `id`, `Date` becomes an ISO string.
- **Server only.** `~/lib/db`, `~/utils/auth` and anything importing `mongodb`
  must not be imported from a Client Component.
- Admin routes are `noindex` through `src/app/admin/layout.tsx`.
- `PUT /api/cv` writes `src/data/cv.json` and answers `404` outside
  development on purpose — the CV is published through git, not at runtime.

### Environment

| Variable | Used by | Notes |
| --- | --- | --- |
| `MONGODB_URI` | `lib/db.ts`, seed script | required for admin |
| `MONGODB_DB` | `lib/db.ts`, seed script | optional, defaults to `portfolio` |
| `AUTH_SECRET` | `utils/auth.ts` | at least 32 characters |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | `scripts/seed-admin.mjs` only | never read by the app |

- `.env*` is gitignored. Never commit a secret, print one, or paste one into a
  note. Only the bcrypt hash of the admin password is stored.
- `pnpm seed:admin` creates the admin user (or resets its password) and the
  indexes.
- `pnpm seed:k8s` rebuilds the Kubernetes course project, one task per section
  of `content/blog/k8s` and one logtime a day; `--dry` only prints the plan.
  It replaces only the documents it created itself (`seed: "k8s-course"`).
- An admin project is `WorkProjectModel` — `ProjectModel` is the public
  showcase entry and has nothing to do with the database.
- The public site must still build and run with none of these set.

---

## Folder Structure

```
content/
├── blog/              # markdown notes — the blog's source of truth
└── recipes/           # flat shelf of recipe notes
public/                # static assets served as-is (never put drafts here)
└── code/<name>/       # exercise source, zipped on demand at /code/<name>.zip
scripts/               # one-off Node scripts (seed-admin, seed-k8s-course)
src/
├── app/               # App Router: routes, layouts, globals.css
│   ├── _components/   # sections used only by the home page
│   ├── <route>/_components/  # components used only by that route
│   ├── admin/         # login, plus the (panel) group: sidebar, logtime, tasks, projects
│   ├── api/           # route handlers: auth, projects, tasks, logtimes, categories, tags, cv
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
├── lib/               # talks to the outside: db, api-client, task, logtime, project, label (+ cn)
├── styles/
├── types/             # shared types + barrel
└── utils/             # everything else: content loaders, auth, schema, admin-time, local, …
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
