import { Pool } from "pg";
import url from "url";

let pool;
let losPool;

async function createPool(connectionString) {
  const params = url.parse(connectionString);
  return new Pool({
    connectionString,
    ssl: sslOptions(params.hostname),
  });
}

// Hacky way to disable ssl when running locally
// TODO: get ssl running locally
// TODO: Figure out how to verify the key
function sslOptions(host) {
  // console.log(host);
  if (host === "localhost" || host === "127.0.0.1") return false;
  return {
    rejectUnauthorized: false,
    mode: "require",
  };
}

export async function performQuery(text, values) {
  if (!pool) {
    pool = await createPool(process.env.DATABASE_URL);
  }
  const client = await pool.connect();
  const result = await client.query(text, values);
  client.release();
  return result.rows;
}

export async function performLosQuery(text, values) {
  if (!losPool) {
    losPool = await createPool(process.env.LOS_DATABASE_URL);
  }
  const client = await losPool.connect();
  const result = await client.query(text, values);
  client.release();
  return result.rows;
}

export async function end() {
  if (pool) {
    await pool.end();
  }

  if (losPool) {
    await losPool.end();
  }
}
