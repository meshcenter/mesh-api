import pathToRegexp from "path-to-regexp";
import { performQuery } from "./db";
import { createResponse } from "./utils";

export async function handler(event) {
	if (event.httpMethod === "OPTIONS") {
		return createResponse(200);
	}

	try {
		if (event.httpMethod === "GET") {
			if (event.path === "/buildings") {
				const buildings = await getBuildings();
				return createResponse(200, buildings);
			}

			if (event.path === "/buildings/") {
				return createResponse(404, {
					error: {
						message: `Unrecognized request URL (${event.httpMethod} ${event.path}). If you are trying to list objects, remove the trailing slash. If you are trying to retrieve an object, pass a valid identifier.`
					}
				});
			}

			// TODO: Do this better
			const regex = pathToRegexp("/buildings/:id", null, {
				strict: true
			});
			const result = regex.exec(event.path);

			if (!result) {
				return createResponse(404, {
					error: {
						message: `Unrecognized request URL (${event.httpMethod} ${event.path}).`
					}
				});
			}

			const id = result[1];
			const building = await getBuilding(id);
			if (!building) {
				return createResponse(404, {
					error: {
						message: `No such building: ${id}`
					}
				});
			}

			return createResponse(200, building);
		} else if (event.httpMethod === "POST") {
			// if (!isValidBul(event.body))
			// 	return createResponse(400, {
			// 		error: {
			// 			message: "Must provide lat, lng, alt, and created."
			// 		}
			// 	});
			// const node = await createNode(event.body);
			// return createResponse(200, node);
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

async function getBuilding(id) {
	if (!Number.isInteger(parseInt(id, 10))) return null;
	const buildings = await performQuery(
		"SELECT * FROM buildings WHERE id = $1",
		[id]
	);
	if (!buildings.length) return null;
	const building = buildings[0];
	const buildingNodes = await performQuery(
		"SELECT * FROM nodes WHERE building_id = $1",
		[id]
	);
	const buildingRequests = await performQuery(
		"SELECT * FROM requests WHERE building_id = $1",
		[id]
	);
	return {
		...building,
		nodes: buildingNodes,
		requests: buildingRequests
	};
}

async function getBuildings() {
	return performQuery(
		`SELECT
			buildings.*,
			JSON_AGG(DISTINCT nodes.*) AS nodes
		FROM
			buildings
			LEFT JOIN nodes ON nodes.building_id = buildings.id
			LEFT JOIN requests ON requests.building_id = buildings.id
		GROUP BY
			buildings.id
		ORDER BY
			COUNT(DISTINCT nodes.*) DESC`
	);
}
