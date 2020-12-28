import { Pool } from "pg";
import url from "url";

let pool;
let losPool;

async function createPool() {
  const params = url.parse(process.env.DATABASE_URL);
  const auth = params.auth && params.auth.split(":");

  const user = auth ? auth[0] : null;
  const password = auth ? auth[1] : null;

  pool = new Pool({
    host: params.hostname,
    database: params.pathname.split("/")[1],
    user: user,
    password: password,
    port: params.port,
    ssl: sslOptions(params.hostname),
  });
}

async function createLosPool() {
  losPool = new Pool({
    host: process.env.LOS_DB_HOST,
    database: process.env.LOS_DB_NAME,
    user: process.env.LOS_DB_USER,
    password: process.env.LOS_DB_PASS,
    port: process.env.LOS_DB_PORT,
    ssl: sslOptions(process.env.LOS_DB_HOST),
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
  if (!pool) await createPool();
  const client = await pool.connect();
  const result = await client.query(text, values);
  client.release();
  return result.rows;
}

export async function performLosQuery(text, values) {
  if (!losPool) await createLosPool();
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
