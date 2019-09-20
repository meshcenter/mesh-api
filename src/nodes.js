import pathToRegexp from "path-to-regexp";
import { performQuery } from "./db";
import { createResponse } from "./utils";

export async function handler(event) {
	if (event.httpMethod === "OPTIONS") {
		return createResponse(200);
	}

	try {
		if (event.httpMethod === "GET") {
			if (event.path === "/nodes/") {
				return createResponse(404, {
					error: {
						message: `Unrecognized request URL (${event.httpMethod} ${event.path}). If you are trying to list objects, remove the trailing slash. If you are trying to retrieve an object, pass a valid identifier.`
					}
				});
			}

			if (event.path === "/nodes") {
				const nodes = await getNodes();
				return createResponse(200, nodes);
			}

			// TODO: Do this better
			const regex = pathToRegexp("/nodes/:id", null, { strict: true });
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
	const result = await performQuery(
		`SELECT
			nodes.*,
			to_json(buildings) AS building,
			to_json(members) AS member
		FROM
			nodes
			LEFT JOIN buildings ON nodes.building_id = buildings.id
			LEFT JOIN members ON nodes.member_id = members.id
		WHERE
			nodes.id = $1
		GROUP BY
			nodes.id,
			buildings.id,
			members.id`,
		[id]
	);
	return result[0];
}

async function getNodes(id) {
	return performQuery(
		`SELECT
			nodes.*,
			buildings.address AS building,
			json_agg(json_build_object('id', devices.id, 'type', device_types, 'lat', devices.lat, 'lng', devices.lng, 'alt', devices.alt, 'azimuth', devices.azimuth, 'status', devices.status, 'name', devices.name, 'ssid', devices.ssid, 'notes', devices.notes, 'install_date', devices.install_date, 'abandon_date', devices.abandon_date)) AS devices
		FROM
			nodes
			LEFT JOIN buildings ON nodes.building_id = buildings.id
			LEFT JOIN devices ON nodes.id = devices.node_id
			LEFT JOIN device_types ON device_types.id IN (devices.device_type_id)
		GROUP BY
			nodes.id,
			buildings.id
		ORDER BY
			nodes.created DESC`
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
