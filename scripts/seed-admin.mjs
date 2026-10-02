// Creates (or resets the password of) the admin account.
//   pnpm seed:admin
// Reads MONGODB_URI, MONGODB_DB, ADMIN_USERNAME and ADMIN_PASSWORD from `.env`
// or the shell. The password never lives in the repo — only its bcrypt hash
// lands in the database.
import { existsSync } from "node:fs";
import { hash } from "bcryptjs";
import { MongoClient } from "mongodb";

for (const file of [".env.local", ".env"]) {
  // Earlier files win: loadEnvFile never overrides a variable already set.
  if (existsSync(file)) process.loadEnvFile(file);
}

const { MONGODB_URI, MONGODB_DB, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;

if (!MONGODB_URI || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error("Need MONGODB_URI, ADMIN_USERNAME and ADMIN_PASSWORD.");
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI);

try {
  await client.connect();
  const db = client.db(MONGODB_DB ?? "portfolio");
  const users = db.collection("users");

  await users.createIndex({ username: 1 }, { unique: true });
  await db.collection("worklogs").createIndex({ date: -1, createdAt: -1 });

  const { upsertedCount } = await users.updateOne(
    { username: ADMIN_USERNAME },
    {
      $set: {
        passwordHash: await hash(ADMIN_PASSWORD, 12),
        role: "admin",
        failedLogins: 0,
        lockedUntil: null,
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  console.log(
    `${upsertedCount ? "Created" : "Updated"} admin "${ADMIN_USERNAME}" in ${db.databaseName}.`
  );
} finally {
  await client.close();
}
