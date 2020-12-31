const { Pool } = require("pg");
const url = require("url");

let pgPool;

async function createPool(connectionString) {
  const params = url.parse(connectionString);
  pgPool = new Pool({
    connectionString,
    ssl: sslOptions(params.hostname),
  });
}

// See src/db/index.js
function sslOptions(host) {
  if (host === "localhost" || host === "127.0.0.1") return false;
  return {
    rejectUnauthorized: false,
    mode: "require",
  };
}

async function performQuery(text, values) {
  if (!pgPool) await createPool(process.env.DATABASE_URL);
  const client = await pgPool.connect();
  const result = await client.query(text, values);
  client.release();
  return result.rows;
}

async function insertBulk(tableName, valueNames, items, valueExtractor) {
  const commandText = `INSERT INTO ${tableName}`;
  const valueNameText = `(${valueNames.join(", ")})`; // (id, name, email)
  let queryText = `${commandText} ${valueNameText} VALUES `;

  const queryValues = [];
  for (let i = 0; i < items.length; i++) {
    const values = valueExtractor(items[i]);

    // TODO: This is pretty hacky.. should use named parameters instead
    // "($1, $2, $3, $4, $5, $6)"
    const oneToN = Array.from(Array(values.length), (e, i) => i + 1);
    const offset = queryValues.length;
    const indexVars = oneToN.map((i) => `$${offset + i}`).join(", ");
    const indexVarsText = `(${indexVars})`;

    queryText += indexVarsText;
    if (i < items.length - 1) queryText += ", ";

    queryValues.push(...values);
  }

  return performQuery(queryText, queryValues);
}

module.exports = { performQuery, insertBulk };
