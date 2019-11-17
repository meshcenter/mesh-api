const { Pool } = require("pg");

let pgPool;

async function createPool() {
	pgPool = new Pool({
		host: process.env.DB_HOST,
		database: process.env.DB_NAME,
		user: process.env.DB_USER,
		password: process.env.DB_PASS,
		port: process.env.DB_PORT,
		ssl: {
			mode: "require"
		}
	});
}

async function performQuery(text, values) {
	if (!pgPool) await createPool();
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
		const indexVars = oneToN.map(i => `$${offset + i}`).join(", ");
		const indexVarsText = `(${indexVars})`;

		queryText += indexVarsText;
		if (i < items.length - 1) queryText += ", ";

		queryValues.push(...values);
	}

	return performQuery(queryText, queryValues);
}

module.exports = { performQuery, insertBulk };
