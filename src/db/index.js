import { Pool } from "pg";
import HerokuClient from "heroku-client";

let pgPool;

async function createPool() {
	const heroku = new HerokuClient({ token: process.env.HEROKU_API_TOKEN });
	const configEndpoint = `/addons/${process.env.HEROKU_ADD_ON_ID}/config`;
	const [config] = await heroku.get(configEndpoint);
	const connectionString = config.value;
	pgPool = new Pool({
		connectionString,
		ssl: true
	});
}

export async function performQuery(text, values) {
	if (!pgPool) await createPool();
	const client = await pgPool.connect();
	const result = await client.query(text, values);
	client.release();
	return result.rows;
}
