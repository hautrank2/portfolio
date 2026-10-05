// Seeds the admin area with the Kubernetes course as it was actually studied:
// one project, one task per section of `content/blog/k8s`, and one logtime a
// day from the start date until today.
//   pnpm seed:k8s          write to the database
//   pnpm seed:k8s --dry    only print what would be written
// Safe to re-run: everything it creates carries `seed: SEED_KEY` and is
// replaced on the next run. Categories and tags are reused by title.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { MongoClient } from "mongodb";

for (const file of [".env.local", ".env"]) {
  // Earlier files win: loadEnvFile never overrides a variable already set.
  if (existsSync(file)) process.loadEnvFile(file);
}

const SEED_KEY = "k8s-course";
const TRACK_DIR = path.join("content", "blog", "k8s");
const TRACK_URL = "/blog/k8s";
// Same pinned zone as `src/lib/admin-time.ts`.
const UTC_OFFSET = "+07:00";
const START_DAY = "2026-06-01";
// Days spent recording the AWS demo videos instead of studying a lesson.
const VIDEO_DAYS = [
  { day: "2026-10-01", part: "IAM role và VPC" },
  { day: "2026-10-02", part: "EFS, EBS, ELB và EC2" },
  { day: "2026-10-03", part: "tạo EKS cluster, nối kubectl, thêm worker node" },
  { day: "2026-10-04", part: "gắn EFS làm volume và dọn dẹp" },
];
const VIDEO_SECTION = "deploy-to-cloud";
// Whole and half hours — the form takes hours.
const STUDY_MINUTES = [60, 90, 120, 90, 60, 120];

const dryRun = process.argv.includes("--dry");

// ---------------------------------------------------------------- content

const readNote = (file) => matter(readFileSync(file, "utf8")).data;

/** Lessons under `dir`, in `order:` order, flattened through sub-folders. */
const collectLessons = (dir, urlPath, technologies) => {
  const lessons = [];
  for (const entry of readNote(path.join(dir, "index.md")).order ?? []) {
    const slug = typeof entry === "string" ? entry : entry.slug;
    const target = path.join(dir, slug);
    const url = `${urlPath}/${slug}`;

    if (existsSync(path.join(target, "index.md"))) {
      lessons.push(
        ...collectLessons(target, url, SUBSECTION_TECHNOLOGIES[slug] ?? technologies)
      );
    } else if (existsSync(`${target}.md`)) {
      const note = readNote(`${target}.md`);
      if (note.draft) continue;
      lessons.push({
        title: note.title ?? slug,
        description: note.description,
        url,
        technologies,
      });
    }
    // An `order:` entry with no file is a planned note — nothing was studied.
  }
  return lessons;
};

const SECTION_TECHNOLOGIES = {
  foundations: ["Linux"],
  "getting-started": ["Kubernetes"],
  "k8s-in-action": ["Kubernetes", "kubectl"],
  "data-and-volumes": ["Kubernetes", "Volumes"],
  networking: ["Kubernetes", "Networking"],
  "deploy-to-cloud": ["Kubernetes", "AWS", "EKS"],
  "wrap-up": ["Kubernetes"],
};

const SUBSECTION_TECHNOLOGIES = {
  linux: ["Linux"],
  networking: ["Networking"],
  container: ["Docker"],
};

const SECTION_TAGS = {
  foundations: ["linux", "docker"],
  "deploy-to-cloud": ["aws"],
};

const readSections = () => {
  const track = readNote(path.join(TRACK_DIR, "index.md"));
  const sections = [];
  // Notes sitting directly under the track have no section of their own.
  const orientation = {
    slug: "orientation",
    title: "Orientation",
    description: "Where to start and the project that runs through the course.",
    lessons: [],
  };

  for (const entry of track.order ?? []) {
    const slug = typeof entry === "string" ? entry : entry.slug;
    const target = path.join(TRACK_DIR, slug);
    if (existsSync(path.join(target, "index.md"))) {
      const index = readNote(path.join(target, "index.md"));
      if (index.draft) continue;
      sections.push({
        slug,
        title: index.title ?? slug,
        description: index.description,
        lessons: collectLessons(
          target,
          `${TRACK_URL}/${slug}`,
          SECTION_TECHNOLOGIES[slug] ?? ["Kubernetes"]
        ),
      });
    } else if (existsSync(`${target}.md`)) {
      const note = readNote(`${target}.md`);
      if (note.draft) continue;
      orientation.lessons.push({
        title: note.title ?? slug,
        description: note.description,
        url: `${TRACK_URL}/${slug}`,
        technologies: ["Kubernetes"],
      });
    }
  }

  return [orientation, ...sections].filter((section) => section.lessons.length > 0);
};

// ------------------------------------------------------------------ dates

const at = (day, time) => new Date(`${day}T${time}:00${UTC_OFFSET}`);

const dayOf = (date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

/** Every day from `first` to `last`, inclusive, as `YYYY-MM-DD`. */
const daysBetween = (first, last) => {
  const days = [];
  for (
    let cursor = new Date(`${first}T00:00:00Z`);
    cursor <= new Date(`${last}T00:00:00Z`);
    cursor = new Date(cursor.getTime() + 86_400_000)
  ) {
    days.push(cursor.toISOString().slice(0, 10));
  }
  return days;
};

// ----------------------------------------------------------------- titles

// Sections where a lesson means typing commands against a cluster.
const HANDS_ON_SECTIONS = new Set([
  "k8s-in-action",
  "data-and-volumes",
  "networking",
  "deploy-to-cloud",
]);

const FIRST_PASS = [
  (topic) => `Học bài "${topic}" và viết note`,
  (topic) => `Xem bài "${topic}", ghi lại note`,
  (topic) => `Đọc tài liệu và viết note về "${topic}"`,
];
const FIRST_PASS_HANDS_ON = [
  (topic) => `Học bài "${topic}" và chạy thử trên cluster`,
  (topic) => `Làm theo bài "${topic}", viết note`,
  (topic) => `Xem bài "${topic}", gõ lại từng lệnh và ghi note`,
];
const SECOND_PASS = [
  (topic) => `Thực hành lại "${topic}" và sửa note`,
  (topic) => `Làm lab cho bài "${topic}"`,
  (topic) => `Ôn lại "${topic}", bổ sung note`,
];

/**
 * A logtime title says what was done, not what the lesson is called — so the
 * lesson's numbering goes and a verb comes in. `variant` only rotates the
 * wording so 127 entries do not all read the same.
 */
const toActionTitle = (lesson, isReview, variant) => {
  const topic = lesson.title.replace(/^\d+\.\d+\s+/, "");
  if (/^Tóm tắt module/i.test(topic)) {
    return isReview ? "Rà lại toàn bộ note của module" : "Ôn lại và tổng kết module";
  }
  const templates = isReview
    ? SECOND_PASS
    : HANDS_ON_SECTIONS.has(lesson.section)
      ? FIRST_PASS_HANDS_ON
      : FIRST_PASS;
  return templates[variant % templates.length](topic);
};

// ------------------------------------------------------------------- plan

const buildPlan = () => {
  const sections = readSections();
  const lessons = sections.flatMap((section) =>
    section.lessons.map((lesson) => ({ ...lesson, section: section.slug }))
  );

  const today = dayOf(new Date());
  const videoDays = VIDEO_DAYS.filter((video) => video.day <= today);
  const skipped = new Set(videoDays.map((video) => video.day));
  const studyDays = daysBetween(START_DAY, today).filter((day) => !skipped.has(day));

  const logtimes = [];
  const now = new Date();
  const addLog = (day, minutes, fields) => {
    // Written down that evening — or just now, for an entry dated today.
    const evening = at(day, "21:30");
    const writtenAt = evening > now ? now : evening;
    logtimes.push({
      ...fields,
      loggedAt: at(day, "00:00"),
      durationMinutes: minutes,
      createdAt: writtenAt,
      updatedAt: writtenAt,
    });
  };

  // One logtime per study day, walking the lessons in order. With more days
  // than lessons some lessons take a second day (review and lab); with more
  // lessons than days a day carries several.
  const dayCount = studyDays.length;
  const lessonCount = lessons.length;
  studyDays.forEach((day, k) => {
    const first = Math.floor((k * lessonCount) / dayCount);
    const next = Math.floor(((k + 1) * lessonCount) / dayCount);
    const isReview =
      dayCount >= lessonCount &&
      k > 0 &&
      Math.floor(((k - 1) * lessonCount) / dayCount) === first;
    const last = dayCount >= lessonCount ? first : Math.max(next - 1, first);

    for (let index = first; index <= last; index++) {
      const lesson = lessons[index];
      addLog(day, STUDY_MINUTES[(k + index) % STUDY_MINUTES.length], {
        title: toActionTitle(lesson, isReview, k),
        section: lesson.section,
        category: "Study",
        technologies: lesson.technologies,
      });
    }
  });

  for (const video of videoDays) {
    addLog(video.day, 240, {
      title: `Quay video demo AWS: ${video.part}`,
      section: VIDEO_SECTION,
      category: "Video demo",
      technologies: ["AWS", "EKS", "Kubernetes"],
    });
  }

  logtimes.sort((a, b) => a.loggedAt - b.loggedAt);
  return { sections, lessons, logtimes, today };
};

// --------------------------------------------------------------------- db

const ensureLabels = async (collection, labels) => {
  const ids = {};
  for (const label of labels) {
    const now = new Date();
    const doc = await collection.findOneAndUpdate(
      { title: label.title },
      { $setOnInsert: { ...label, createdAt: now, updatedAt: now } },
      { upsert: true, returnDocument: "after" }
    );
    ids[label.title] = doc._id;
  }
  return ids;
};

const plan = buildPlan();
const perSection = (slug) => plan.logtimes.filter((log) => log.section === slug);

console.log(
  `${plan.sections.length} sections, ${plan.lessons.length} lessons, ` +
    `${plan.logtimes.length} logtimes from ${START_DAY} to ${plan.today}.`
);
for (const section of plan.sections) {
  const logs = perSection(section.slug);
  console.log(
    `  ${section.title}: ${section.lessons.length} lessons, ${logs.length} logtimes, ` +
      `${dayOf(logs[0].loggedAt)} -> ${dayOf(logs[logs.length - 1].loggedAt)}`
  );
}

if (dryRun) {
  console.log("Dry run — nothing written.");
  process.exit(0);
}

const { MONGODB_URI, MONGODB_DB } = process.env;
if (!MONGODB_URI) {
  console.error("Need MONGODB_URI.");
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI, { ignoreUndefined: true });

try {
  await client.connect();
  const db = client.db(MONGODB_DB ?? "portfolio");
  const projects = db.collection("projects");
  const tasks = db.collection("tasks");
  const logtimes = db.collection("logtimes");

  // Replace whatever an earlier run of this script left behind.
  const seeded = { seed: SEED_KEY };
  await Promise.all([
    logtimes.deleteMany(seeded),
    tasks.deleteMany(seeded),
    projects.deleteMany(seeded),
  ]);

  const categoryIds = await ensureLabels(db.collection("categories"), [
    { title: "Study", color: "#38bdf8" },
    { title: "Video demo", color: "#fb7185" },
  ]);
  const tagIds = await ensureLabels(db.collection("tags"), [
    { title: "kubernetes", color: "#38bdf8" },
    { title: "docker", color: "#a78bfa" },
    { title: "linux", color: "#fbbf24" },
    { title: "aws", color: "#f97316" },
  ]);

  const startedAt = at(START_DAY, "20:00");
  const lastLog = plan.logtimes[plan.logtimes.length - 1];
  const { insertedId: projectId } = await projects.insertOne({
    ...seeded,
    title: "Docker & Kubernetes: The Practical Guide",
    description:
      "Working through the Kubernetes half of the course, one note per lesson. " +
      `Notes live at ${TRACK_URL}; the demo videos for the AWS section are still to be published.`,
    status: "ACTIVE",
    color: "#38bdf8",
    createdAt: startedAt,
    updatedAt: lastLog.updatedAt,
  });

  const taskIdBySection = {};
  for (const [position, section] of plan.sections.entries()) {
    const logs = perSection(section.slug);
    const finishedAt = logs[logs.length - 1].updatedAt;
    // The AWS section stays open until its demo videos are published.
    const done = section.slug !== VIDEO_SECTION;
    const { insertedId } = await tasks.insertOne({
      ...seeded,
      title: `${position + 1}. ${section.title}`,
      description: [
        section.description,
        `${section.lessons.length} lessons — ${TRACK_URL}${section.slug === "orientation" ? "" : `/${section.slug}`}`,
      ]
        .filter(Boolean)
        .join("\n"),
      status: done ? "DONE" : "IN_PROGRESS",
      priority: "MEDIUM",
      projectId,
      tagIds: ["kubernetes", ...(SECTION_TAGS[section.slug] ?? [])].map(
        (title) => tagIds[title]
      ),
      categoryIds: [categoryIds.Study],
      technologies: [...new Set(section.lessons.flatMap((lesson) => lesson.technologies))],
      ...(done ? { completedAt: finishedAt } : {}),
      createdAt: logs[0].loggedAt,
      updatedAt: finishedAt,
    });
    taskIdBySection[section.slug] = insertedId;
  }

  await logtimes.insertMany(
    plan.logtimes.map(({ section, category, ...log }) => ({
      ...seeded,
      ...log,
      taskId: taskIdBySection[section],
      categoryId: categoryIds[category],
    }))
  );

  await projects.createIndex({ createdAt: -1 });
  console.log(
    `Wrote 1 project, ${plan.sections.length} tasks and ${plan.logtimes.length} logtimes to ${db.databaseName}.`
  );
} finally {
  await client.close();
}
