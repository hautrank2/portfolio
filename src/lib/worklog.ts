import { ObjectId, type WithId } from "mongodb";
import { z } from "zod";
import { getDb } from "~/lib/db";
import type { WorkLogInputModel, WorkLogModel } from "~/types";

type WorkLogDoc = WorkLogInputModel & {
  createdAt: Date;
  updatedAt: Date;
};

export const workLogInputSchema = z.object({
  date: z.iso.date(),
  content: z.string().trim().min(1).max(5000),
  technologies: z.array(z.string().trim().min(1).max(40)).max(20),
  hours: z.number().min(0).max(24),
});

export const workLogMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

const getCollection = async () =>
  (await getDb()).collection<WorkLogDoc>("worklogs");

const toModel = (doc: WithId<WorkLogDoc>): WorkLogModel => ({
  id: doc._id.toHexString(),
  date: doc.date,
  content: doc.content,
  technologies: doc.technologies,
  hours: doc.hours,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

const dedupe = (technologies: string[]) => [...new Set(technologies)];

/** `month` is `YYYY-MM`; omitted means every log. Newest day first. */
export const listWorkLogs = async (month?: string): Promise<WorkLogModel[]> => {
  const collection = await getCollection();
  // Dates are zero-padded strings, so a lexical range is a calendar range.
  const filter = month ? { date: { $gte: `${month}-01`, $lte: `${month}-31` } } : {};
  const docs = await collection
    .find(filter)
    .sort({ date: -1, createdAt: -1 })
    .toArray();
  return docs.map(toModel);
};

export const createWorkLog = async (
  input: WorkLogInputModel
): Promise<WorkLogModel> => {
  const collection = await getCollection();
  const now = new Date();
  const doc: WorkLogDoc = {
    ...input,
    technologies: dedupe(input.technologies),
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await collection.insertOne(doc);
  return toModel({ ...doc, _id: insertedId });
};

export const updateWorkLog = async (
  id: string,
  input: WorkLogInputModel
): Promise<WorkLogModel | null> => {
  if (!ObjectId.isValid(id)) return null;
  const collection = await getCollection();
  const doc = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...input,
        technologies: dedupe(input.technologies),
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );
  return doc ? toModel(doc) : null;
};

export const deleteWorkLog = async (id: string): Promise<boolean> => {
  if (!ObjectId.isValid(id)) return false;
  const collection = await getCollection();
  const { deletedCount } = await collection.deleteOne({ _id: new ObjectId(id) });
  return deletedCount === 1;
};
