import type { ObjectId, WithId } from "mongodb";
import { z } from "zod";
import { dayOf, daysOfMonth, monthRange, today } from "~/utils/admin-time";
import {
  collectionNames,
  findPage,
  getDb,
  type TimestampsDoc,
  toObjectId,
  toReplaceUpdate,
} from "~/lib/db";
import {
  isoDateTimeSchema,
  objectIdSchema,
  optionalText,
  technologiesSchema,
} from "~/utils/schema";
import type {
  LogtimeInputModel,
  LogtimeModel,
  LogtimeSummaryModel,
  PageModel,
  PageQueryModel,
} from "~/types";

type LogtimeDoc = TimestampsDoc & {
  title: string;
  note?: string;
  taskId?: ObjectId;
  categoryId?: ObjectId;
  loggedAt: Date;
  durationMinutes: number;
  technologies: string[];
};

export const logtimeInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  note: optionalText(5000),
  taskId: objectIdSchema.optional(),
  categoryId: objectIdSchema.optional(),
  loggedAt: isoDateTimeSchema,
  // Minutes, so a quarter of an hour stays a whole number.
  durationMinutes: z.number().int().min(1).max(1440),
  technologies: technologiesSchema,
});

const getCollection = async () =>
  (await getDb()).collection<LogtimeDoc>(collectionNames.logtimes);

const toModel = (doc: WithId<LogtimeDoc>): LogtimeModel => ({
  id: doc._id.toHexString(),
  title: doc.title,
  note: doc.note,
  taskId: doc.taskId?.toHexString(),
  categoryId: doc.categoryId?.toHexString(),
  loggedAt: doc.loggedAt.toISOString(),
  durationMinutes: doc.durationMinutes,
  technologies: doc.technologies,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

/** The stored fields a client is allowed to set. */
const toFields = (input: LogtimeInputModel) => ({
  title: input.title,
  note: input.note,
  taskId: (input.taskId && toObjectId(input.taskId)) || undefined,
  categoryId: (input.categoryId && toObjectId(input.categoryId)) || undefined,
  loggedAt: new Date(input.loggedAt),
  durationMinutes: input.durationMinutes,
  technologies: input.technologies,
});

const NEWEST_FIRST = { loggedAt: -1, createdAt: -1 } as const;

/** `month` is `YYYY-MM`; omitted means every logtime. */
const monthFilter = (month?: string) => {
  if (!month) return {};
  const range = monthRange(month);
  return { loggedAt: { $gte: range.from, $lt: range.to } };
};

/** Newest first. */
export const listLogtimes = async (month?: string): Promise<LogtimeModel[]> => {
  const collection = await getCollection();
  const docs = await collection.find(monthFilter(month)).sort(NEWEST_FIRST).toArray();
  return docs.map(toModel);
};

export const listLogtimesPage = async (
  query: PageQueryModel & { month?: string }
): Promise<PageModel<LogtimeModel>> => {
  const collection = await getCollection();
  const { docs, total } = await findPage(
    collection,
    monthFilter(query.month),
    NEWEST_FIRST,
    query
  );
  return {
    page: query.page,
    pageSize: query.pageSize,
    items: docs.map(toModel),
    total,
  };
};

/** Totals across the whole month, independent of which page is shown. */
export const summarizeLogtimes = async (
  month?: string
): Promise<LogtimeSummaryModel> => {
  const collection = await getCollection();
  const docs = await collection
    .find(monthFilter(month), {
      projection: { loggedAt: 1, durationMinutes: 1, technologies: 1 },
    })
    .toArray();

  const days = new Set<string>();
  const counts = new Map<string, number>();
  let totalMinutes = 0;
  for (const doc of docs) {
    days.add(dayOf(doc.loggedAt.toISOString()));
    totalMinutes += doc.durationMinutes ?? 0;
    for (const name of doc.technologies) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  const currentDay = today();
  const missedDays = month
    ? daysOfMonth(month).filter((day) => day <= currentDay && !days.has(day)).length
    : 0;

  return {
    totalMinutes,
    days: days.size,
    missedDays,
    technologies: [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
};

export const createLogtime = async (
  input: LogtimeInputModel
): Promise<LogtimeModel> => {
  const collection = await getCollection();
  const now = new Date();
  const doc: LogtimeDoc = { ...toFields(input), createdAt: now, updatedAt: now };
  const { insertedId } = await collection.insertOne(doc);
  return toModel({ ...doc, _id: insertedId });
};

export const updateLogtime = async (
  id: string,
  input: LogtimeInputModel
): Promise<LogtimeModel | null> => {
  const _id = toObjectId(id);
  if (!_id) return null;
  const collection = await getCollection();
  const doc = await collection.findOneAndUpdate(
    { _id },
    toReplaceUpdate<LogtimeDoc>(toFields(input)),
    { returnDocument: "after" }
  );
  return doc ? toModel(doc) : null;
};

export const deleteLogtime = async (id: string): Promise<boolean> => {
  const _id = toObjectId(id);
  if (!_id) return false;
  const collection = await getCollection();
  const { deletedCount } = await collection.deleteOne({ _id });
  return deletedCount === 1;
};
