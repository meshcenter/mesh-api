require("dotenv").config();
const { Pool } = require("pg");
const url = require("url");

createTables().then(() => process.exit(0));

async function createTables() {
  const pool = createPool(process.env.LOS_DATABASE_URL);
  await performQuery(pool, "CREATE EXTENSION IF NOT EXISTS postgis");
  await performQuery(pool, "CREATE EXTENSION IF NOT EXISTS postgis_sfcgal");
  await performQuery(pool, "DROP TABLE IF EXISTS buildings");
  await performQuery(
    pool,
    "CREATE TABLE IF NOT EXISTS buildings(gid SERIAL PRIMARY KEY, bldg_id varchar(255), bldg_bin varchar(255), geom GEOMETRY('MULTIPOLYGONZ', 2263))"
  );
  await performQuery(
    pool,
    "CREATE INDEX IF NOT EXISTS geom_index ON buildings USING GIST (geom)"
  );
  await performQuery(
    pool,
    "CREATE INDEX IF NOT EXISTS bin_index ON buildings (bldg_bin)"
  );
}

async function performQuery(pool, text, values) {
  const client = await pool.connect();
  const result = await client.query(text, values);
  client.release();
  return result.rows;
}

function createPool(connectionString) {
  const params = url.parse(connectionString);
  return new Pool({
    connectionString,
    ssl: sslOptions(params.hostname),
  });

  // See src/db/index.js
  function sslOptions(host) {
    if (host === "localhost" || host === "127.0.0.1") return false;
    return {
      rejectUnauthorized: false,
      mode: "require",
    };
  }
}
