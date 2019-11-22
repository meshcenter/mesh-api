import { performQuery } from ".";

const insertPanoQuery = `INSERT INTO panoramas (url, date, request_id) VALUES ($1, $2, $3) RETURNING id`;

export async function savePano(requestId, panoURL) {
	const values = [panoURL, new Date(), requestId];
	const [pano] = await performQuery(insertPanoQuery, values);
	return pano;
}
