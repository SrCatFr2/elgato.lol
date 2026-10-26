
const { MongoClient } = require("mongodb");

let clientPromise;

async function getMongo() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "elgato";

  if (!uri) {
    throw new Error("Falta MONGODB_URI en las variables de entorno.");
  }

  if (!clientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000
    });

    clientPromise = client.connect();
  }

  const client = await clientPromise;

  return {
    client,
    db: client.db(dbName)
  };
}

module.exports = { getMongo };
