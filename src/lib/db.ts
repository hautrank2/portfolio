import { type Db, MongoClient } from "mongodb";

// Cached on `globalThis` so dev hot-reloads and warm serverless invocations
// reuse one connection pool instead of opening a new one per request.
const globalForMongo = globalThis as typeof globalThis & {
  mongoClient?: Promise<MongoClient>;
};

export const getDb = async (): Promise<Db> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }

  globalForMongo.mongoClient ??= new MongoClient(uri).connect().catch((error) => {
    // Drop the failed attempt, otherwise every later request reuses the
    // rejected promise and the app never reconnects.
    globalForMongo.mongoClient = undefined;
    throw error;
  });

  const client = await globalForMongo.mongoClient;
  return client.db(process.env.MONGODB_DB ?? "portfolio");
};
