import type { WithId } from "mongodb";
import { z } from "zod";
import { workProjectStatusData } from "~/data/admin";
import {
  collectionNames,
  findPage,
  getDb,
  type TimestampsDoc,
  toObjectId,
  toReplaceUpdate,
} from "~/lib/db";
import { hexColorSchema, optionalText } from "~/utils/schema";
import type {
  PageModel,
  PageQueryModel,
  WorkProjectInputModel,
  WorkProjectModel,
  WorkProjectStatusType,
} from "~/types";

type ProjectDoc = TimestampsDoc & {
  title: string;
  description?: string;
  status: WorkProjectStatusType;
  color: string;
  completedAt?: Date;
};

export const projectInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: optionalText(5000),
  status: z.enum(workProjectStatusData),
  color: hexColorSchema,
});

const getCollection = async () =>
  (await getDb()).collection<ProjectDoc>(collectionNames.projects);

const toModel = (doc: WithId<ProjectDoc>): WorkProjectModel => ({
  id: doc._id.toHexString(),
  title: doc.title,
  description: doc.description,
  status: doc.status,
  color: doc.color,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
  completedAt: doc.completedAt?.toISOString(),
});

/** The stored fields a client is allowed to set. */
const toFields = (input: WorkProjectInputModel) => ({
  title: input.title,
  description: input.description,
  status: input.status,
  color: input.color,
});

/** Newest first. */
export const listProjects = async (): Promise<WorkProjectModel[]> => {
  const collection = await getCollection();
  const docs = await collection.find().sort({ createdAt: -1 }).toArray();
  return docs.map(toModel);
};

export const listProjectsPage = async (
  query: PageQueryModel
): Promise<PageModel<WorkProjectModel>> => {
  const collection = await getCollection();
  const { docs, total } = await findPage(collection, {}, { createdAt: -1 }, query);
  return { ...query, items: docs.map(toModel), total };
};

export const createProject = async (
  input: WorkProjectInputModel
): Promise<WorkProjectModel> => {
  const collection = await getCollection();
  const now = new Date();
  const doc: ProjectDoc = {
    ...toFields(input),
    completedAt: input.status === "COMPLETED" ? now : undefined,
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await collection.insertOne(doc);
  return toModel({ ...doc, _id: insertedId });
};

export const updateProject = async (
  id: string,
  input: WorkProjectInputModel
): Promise<WorkProjectModel | null> => {
  const _id = toObjectId(id);
  if (!_id) return null;
  const collection = await getCollection();
  const current = await collection.findOne({ _id });
  if (!current) return null;

  // Keep the first completion time while it stays completed; drop it on reopen.
  const completedAt =
    input.status === "COMPLETED" ? (current.completedAt ?? new Date()) : undefined;
  const doc = await collection.findOneAndUpdate(
    { _id },
    toReplaceUpdate<ProjectDoc>({ ...toFields(input), completedAt }),
    { returnDocument: "after" }
  );
  return doc ? toModel(doc) : null;
};

// A project is never deleted — it is closed by moving it to `COMPLETED` or
// `CANCELLED`, which keeps its tasks and their history together.
