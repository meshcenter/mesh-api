import { Pool } from "pg";

let pgPool;

async function createPool() {
	pgPool = new Pool({
		host: process.env.LOS_DB_HOST,
		database: process.env.LOS_DB_NAME,
		user: process.env.LOS_DB_USER,
		password: process.env.LOS_DB_PASS,
		port: process.env.LOS_DB_PORT,
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
