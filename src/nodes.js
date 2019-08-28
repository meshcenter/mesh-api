import pathToRegexp from "path-to-regexp";
import { performQuery } from "./db";
import { createResponse } from "./utils";

export async function handler(event) {
	try {
		if (event.httpMethod === "GET") {
			if (event.path === "/v1/nodes") {
				const nodes = await getNodes();
				return createResponse(200, nodes);
			}

			if (event.path === "/v1/nodes/") {
				return createResponse(404, {
					error: {
						message: `Unrecognized request URL (${event.httpMethod} ${event.path}). If you are trying to list objects, remove the trailing slash. If you are trying to retrieve an object, pass a valid identifier.`
					}
				});
			}

			// TODO: Do this better
			const regex = pathToRegexp("/v1/nodes/:id", null, { strict: true });
			const result = regex.exec(event.path);

			if (!result) {
				return createResponse(404, {
					error: {
						message: `Unrecognized request URL (${event.httpMethod} ${event.path}).`
					}
				});
			}

			const id = result[1];
			const node = await getNode(id);
			if (!node) {
				return createResponse(404, {
					error: {
						message: `No such node: ${id}`
					}
				});
			}

			return createResponse(200, node);
		} else if (event.httpMethod === "POST") {
			if (!isValidNode(event.body))
				return createResponse(400, {
					error: {
						message: "Must provide lat, lng, alt, and created."
					}
				});
			const node = await createNode(event.body);
			return createResponse(200, node);
		}
	} catch (error) {
		return createResponse(500, {
			error: {
				message: error.message
			}
		});
	}

	return createResponse(400);
}

function isValidNode(node) {
	const { lat, lng, alt, created } = node;
	if (!lat || !lng || !alt || !created) return false;
	return true;
}

async function getNode(id) {
	if (!Number.isInteger(parseInt(id, 10))) return null;
	const result = await performQuery("SELECT * FROM nodes WHERE id = $1", [
		id
	]);
	return result[0];
}

async function getNodes(id) {
	return performQuery(
		"SELECT nodes.*, buildings.address as address FROM nodes LEFT JOIN buildings ON nodes.building_id = buildings.id GROUP BY nodes.id, buildings.id ORDER BY nodes.created DESC;"
	);
}

async function createNode(node) {
	const { lat, lng, alt, name, notes, created, abandoned } = node;
	const text = `INSERT INTO nodes (lat, lng, alt, name, notes, created, abandoned)
	VALUES ($1, $2, $3, $4, $5, $6, $7)`;
	const values = [
		lat,
		lng,
		alt,
		name,
		notes,
		new Date(created),
		abandoned ? new Date(abandoned) : null
	];
	await performQuery(text, values);
	return getNode(event.body.id);
}
