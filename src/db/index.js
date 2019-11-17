import { Pool } from "pg";

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

export async function performQuery(text, values) {
	if (!pgPool) await createPool();
	const client = await pgPool.connect();
	const result = await client.query(text, values);
	client.release();
	return result.rows;
}
