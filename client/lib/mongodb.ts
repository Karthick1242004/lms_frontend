import { MongoClient } from "mongodb";

if (!process.env.MONGODB_CONNECTION_STRING) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_CONNECTION_STRING"');
}

const uri = process.env.MONGODB_CONNECTION_STRING;
const options = {};

let client;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export both the clientPromise and connectToDatabase function
export default clientPromise;

export async function connectToDatabase() {
  const client = await clientPromise;
  const db = client.db("Mudhalvan"); // Using the database name from your connection string
  return { db, client };
} 