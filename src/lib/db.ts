import {
  type Collection,
  type Db,
  type Document,
  type Filter,
  type Sort,
  MongoClient,
  ObjectId,
  type UpdateFilter,
} from "mongodb";

// Cached on `globalThis` so dev hot-reloads and warm serverless invocations
// reuse one connection pool instead of opening a new one per request.
const globalForMongo = globalThis as typeof globalThis & {
  mongoClient?: Promise<MongoClient>;
};

export const collectionNames = {
  users: "users",
  projects: "projects",
  tasks: "tasks",
  logtimes: "logtimes",
  categories: "categories",
  tags: "tags",
} as const;

/** Fields every admin document carries. */
export type TimestampsDoc = {
  createdAt: Date;
  updatedAt: Date;
};

export const getDb = async (): Promise<Db> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }

  // `ignoreUndefined`: an optional field left `undefined` is simply not stored,
  // instead of being written as `null` and coming back as one.
  globalForMongo.mongoClient ??= new MongoClient(uri, { ignoreUndefined: true })
    .connect()
    .catch((error) => {
      // Drop the failed attempt, otherwise every later request reuses the
      // rejected promise and the app never reconnects.
      globalForMongo.mongoClient = undefined;
      throw error;
    });

  const connected = await globalForMongo.mongoClient;
  return connected.db(process.env.MONGODB_DB ?? "portfolio");
};

/** One page of `filter`, and how many documents match it in total. */
export const findPage = async <TDoc extends Document>(
  collection: Collection<TDoc>,
  filter: Filter<TDoc>,
  sort: Sort,
  { page, pageSize }: { page: number; pageSize: number }
) => {
  const [docs, total] = await Promise.all([
    collection
      .find(filter)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    collection.countDocuments(filter),
  ]);
  return { docs, total };
};

/** `null` for anything that is not a valid id, so callers can answer 404. */
export const toObjectId = (id: string) =>
  ObjectId.isValid(id) ? new ObjectId(id) : null;

/**
 * A full replace of the editable fields: defined values are `$set`, `undefined`
 * ones are `$unset` — so clearing an optional field in a form really removes it.
 */
export const toReplaceUpdate = <TDoc extends Document>(
  fields: Record<string, unknown>
): UpdateFilter<TDoc> => {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  const unset: Record<string, ""> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) unset[key] = "";
    else set[key] = value;
  }
  const update: UpdateFilter<Document> =
    Object.keys(unset).length > 0 ? { $set: set, $unset: unset } : { $set: set };
  return update as UpdateFilter<TDoc>;
};
