import type { ObjectId, WithId } from "mongodb";
import { z } from "zod";
import {
  collectionNames,
  getDb,
  type TimestampsDoc,
  toObjectId,
  toReplaceUpdate,
} from "~/lib/db";
import { hexColorSchema, optionalText } from "~/utils/schema";
import type { LabelInputModel, LabelKindType, LabelModel } from "~/types";

export type LabelDoc = TimestampsDoc & {
  title: string;
  description?: string;
  color: string;
};

export const labelInputSchema = z.object({
  title: z.string().trim().min(1).max(60),
  description: optionalText(500),
  color: hexColorSchema,
});

const getCollection = async (kind: LabelKindType) =>
  (await getDb()).collection<LabelDoc>(collectionNames[kind]);

export const toLabelModel = (doc: WithId<LabelDoc>): LabelModel => ({
  id: doc._id.toHexString(),
  title: doc.title,
  description: doc.description,
  color: doc.color,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

export const listLabels = async (kind: LabelKindType): Promise<LabelModel[]> => {
  const collection = await getCollection(kind);
  const docs = await collection.find().sort({ title: 1 }).toArray();
  return docs.map(toLabelModel);
};

export const createLabel = async (
  kind: LabelKindType,
  input: LabelInputModel
): Promise<LabelModel> => {
  const collection = await getCollection(kind);
  const now = new Date();
  const doc: LabelDoc = { ...input, createdAt: now, updatedAt: now };
  const { insertedId } = await collection.insertOne(doc);
  return toLabelModel({ ...doc, _id: insertedId });
};

export const updateLabel = async (
  kind: LabelKindType,
  id: string,
  input: LabelInputModel
): Promise<LabelModel | null> => {
  const _id = toObjectId(id);
  if (!_id) return null;
  const collection = await getCollection(kind);
  const doc = await collection.findOneAndUpdate(
    { _id },
    // Spelled out so a missing `description` is unset rather than left behind.
    toReplaceUpdate<LabelDoc>({
      title: input.title,
      description: input.description,
      color: input.color,
    }),
    { returnDocument: "after" }
  );
  return doc ? toLabelModel(doc) : null;
};

/** Removes every reference to a label that no longer exists. */
const detachLabel = async (kind: LabelKindType, _id: ObjectId) => {
  const db = await getDb();
  const tasks = db.collection<{ tagIds: ObjectId[]; categoryIds: ObjectId[] }>(
    collectionNames.tasks
  );
  if (kind === "tags") {
    await tasks.updateMany({ tagIds: _id }, { $pull: { tagIds: _id } });
    return;
  }
  await Promise.all([
    tasks.updateMany({ categoryIds: _id }, { $pull: { categoryIds: _id } }),
    db
      .collection(collectionNames.logtimes)
      .updateMany({ categoryId: _id }, { $unset: { categoryId: "" } }),
  ]);
};

export const deleteLabel = async (
  kind: LabelKindType,
  id: string
): Promise<boolean> => {
  const _id = toObjectId(id);
  if (!_id) return false;
  const collection = await getCollection(kind);
  const { deletedCount } = await collection.deleteOne({ _id });
  if (deletedCount !== 1) return false;
  await detachLabel(kind, _id);
  return true;
};
