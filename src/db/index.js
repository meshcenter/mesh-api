import { Pool } from "pg";

let pool;
let losPool;

async function createPool() {
	pool = new Pool({
		host: process.env.DB_HOST,
		database: process.env.DB_NAME,
		user: process.env.DB_USER,
		password: process.env.DB_PASS,
		port: process.env.DB_PORT,
		ssl: {
			rejectUnauthorized: false,
			mode: "require"
		}
	});
}

async function createLosPool() {
	losPool = new Pool({
		host: process.env.LOS_DB_HOST,
		database: process.env.LOS_DB_NAME,
		user: process.env.LOS_DB_USER,
		password: process.env.LOS_DB_PASS,
		port: process.env.LOS_DB_PORT,
		ssl: {
			rejectUnauthorized: false,
			mode: "require"
		}
	});
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
