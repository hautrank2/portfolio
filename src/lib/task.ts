import type { Filter, ObjectId, WithId } from "mongodb";
import { z } from "zod";
import { taskPriorityData, taskStatusData } from "~/data/admin";
import {
  collectionNames,
  findPage,
  getDb,
  type TimestampsDoc,
  toObjectId,
  toReplaceUpdate,
} from "~/lib/db";
import { listLabels } from "~/lib/label";
import {
  isoDateTimeSchema,
  objectIdSchema,
  optionalText,
  technologiesSchema,
} from "~/utils/schema";
import type {
  LabelModel,
  PageModel,
  PageQueryModel,
  TaskFilterModel,
  TaskInputModel,
  TaskModel,
  TaskPriorityType,
  TaskStatusType,
} from "~/types";

type TaskDoc = TimestampsDoc & {
  title: string;
  description?: string;
  status: TaskStatusType;
  priority: TaskPriorityType;
  dueDate?: Date;
  projectId?: ObjectId;
  tagIds: ObjectId[];
  categoryIds: ObjectId[];
  technologies: string[];
  completedAt?: Date;
};

type LabelLookup = {
  tags: Map<string, LabelModel>;
  categories: Map<string, LabelModel>;
};

export const taskInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: optionalText(5000),
  status: z.enum(taskStatusData),
  priority: z.enum(taskPriorityData),
  dueDate: isoDateTimeSchema.optional(),
  projectId: objectIdSchema.optional(),
  tagIds: z.array(objectIdSchema).max(30),
  categoryIds: z.array(objectIdSchema).max(30),
  technologies: technologiesSchema,
});

const getCollection = async () =>
  (await getDb()).collection<TaskDoc>(collectionNames.tasks);

const loadLabels = async (): Promise<LabelLookup> => {
  const [tags, categories] = await Promise.all([
    listLabels("tags"),
    listLabels("categories"),
  ]);
  const byId = (labels: LabelModel[]) =>
    new Map(labels.map((label) => [label.id, label]));
  return { tags: byId(tags), categories: byId(categories) };
};

/** Ids whose label has since been deleted are dropped, not shown as blanks. */
const resolve = (ids: ObjectId[], labels: Map<string, LabelModel>) =>
  ids.flatMap((id) => labels.get(id.toHexString()) ?? []);

const toModel = (doc: WithId<TaskDoc>, labels: LabelLookup): TaskModel => ({
  id: doc._id.toHexString(),
  title: doc.title,
  description: doc.description,
  status: doc.status,
  priority: doc.priority,
  dueDate: doc.dueDate?.toISOString(),
  projectId: doc.projectId?.toHexString(),
  tags: resolve(doc.tagIds, labels.tags),
  categories: resolve(doc.categoryIds, labels.categories),
  technologies: doc.technologies,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
  completedAt: doc.completedAt?.toISOString(),
});

const toObjectIds = (ids: string[]) =>
  [...new Set(ids)].flatMap((id) => toObjectId(id) ?? []);

/** The stored fields a client is allowed to set. */
const toFields = (input: TaskInputModel) => ({
  title: input.title,
  description: input.description,
  status: input.status,
  priority: input.priority,
  dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
  projectId: (input.projectId && toObjectId(input.projectId)) || undefined,
  tagIds: toObjectIds(input.tagIds),
  categoryIds: toObjectIds(input.categoryIds),
  technologies: input.technologies,
});

/** Newest first. */
export const listTasks = async (): Promise<TaskModel[]> => {
  const collection = await getCollection();
  const [docs, labels] = await Promise.all([
    collection.find().sort({ createdAt: -1 }).toArray(),
    loadLabels(),
  ]);
  return docs.map((doc) => toModel(doc, labels));
};

/** Callers validate `projectId` first; a malformed one is simply not applied. */
const toFilter = ({ status, projectId }: TaskFilterModel): Filter<TaskDoc> => {
  const projectObjectId = projectId ? toObjectId(projectId) : null;
  return {
    ...(status ? { status } : {}),
    ...(projectObjectId ? { projectId: projectObjectId } : {}),
  };
};

export const listTasksPage = async (
  query: PageQueryModel & TaskFilterModel
): Promise<PageModel<TaskModel>> => {
  const collection = await getCollection();
  const [{ docs, total }, labels] = await Promise.all([
    findPage(collection, toFilter(query), { createdAt: -1 }, query),
    loadLabels(),
  ]);
  return {
    page: query.page,
    pageSize: query.pageSize,
    items: docs.map((doc) => toModel(doc, labels)),
    total,
  };
};

/** How many tasks sit in each status — for one project, or for all of them. */
export const countTasksByStatus = async (
  projectId?: string
): Promise<Record<TaskStatusType, number>> => {
  const collection = await getCollection();
  const groups = await collection
    .aggregate<{ _id: TaskStatusType; count: number }>([
      { $match: toFilter({ projectId }) },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ])
    .toArray();

  const counts: Record<TaskStatusType, number> = {
    TODO: 0,
    IN_PROGRESS: 0,
    DONE: 0,
    CANCELLED: 0,
  };
  for (const group of groups) {
    if (group._id in counts) counts[group._id] = group.count;
  }
  return counts;
};

export const createTask = async (input: TaskInputModel): Promise<TaskModel> => {
  const collection = await getCollection();
  const now = new Date();
  const doc: TaskDoc = {
    ...toFields(input),
    completedAt: input.status === "DONE" ? now : undefined,
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await collection.insertOne(doc);
  return toModel({ ...doc, _id: insertedId }, await loadLabels());
};

export const updateTask = async (
  id: string,
  input: TaskInputModel
): Promise<TaskModel | null> => {
  const _id = toObjectId(id);
  if (!_id) return null;
  const collection = await getCollection();
  const current = await collection.findOne({ _id });
  if (!current) return null;

  // Keep the first completion time while a task stays done; drop it on reopen.
  const completedAt =
    input.status === "DONE" ? (current.completedAt ?? new Date()) : undefined;
  const doc = await collection.findOneAndUpdate(
    { _id },
    toReplaceUpdate<TaskDoc>({ ...toFields(input), completedAt }),
    { returnDocument: "after" }
  );
  return doc ? toModel(doc, await loadLabels()) : null;
};

// A task is never deleted — it is closed by moving it to `DONE` or `CANCELLED`,
// which keeps the logtimes that point at it meaningful.
