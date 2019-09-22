import pathToRegexp from "path-to-regexp";
import { performQuery } from "./db";
import { createResponse, checkAuth } from "./utils";

export async function handler(event) {
	if (event.httpMethod === "OPTIONS") {
		return createResponse(200);
	}

	// Verify token
	try {
		await checkAuth(event);
	} catch (error) {
		return createResponse(401, {
			error: {
				message: error.message
			}
		});
	}

	// Handle request
	try {
		if (event.httpMethod === "GET") {
			if (event.path === "/requests") {
				const requests = await getRequests();
				return createResponse(200, requests);
			}

			if (event.path === "/requests/") {
				return createResponse(404, {
					error: {
						message: `Unrecognized request URL (${event.httpMethod} ${event.path}). If you are trying to list objects, remove the trailing slash. If you are trying to retrieve an object, pass a valid identifier.`
					}
				});
			}

			// TODO: Do this better
			const regex = pathToRegexp("/requests/:id", null, {
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
			const request = await getRequest(id);
			if (!request) {
				return createResponse(404, {
					error: {
						message: `No such request: ${id}`
					}
				});
			}

			return createResponse(200, request);
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

async function getRequest(id) {
	if (!Number.isInteger(parseInt(id, 10))) return null;
	const result = await performQuery(
		`SELECT
			requests.*,
			to_json(buildings) AS building,
			to_json(members) AS member,
			json_agg(json_build_object('id', panoramas.id, 'url', panoramas.url, 'date', panoramas.date)) AS panoramas
		FROM
			requests
			JOIN buildings ON requests.building_id = buildings.id
			JOIN members ON requests.member_id = members.id
			LEFT JOIN panoramas ON requests.id = panoramas.join_request_id
		WHERE
			requests.id = $1
		GROUP BY
			requests.id,
			buildings.id,
			members.id`,
		[id]
	);
	return result[0];
}

async function getRequests() {
	return performQuery(
		`SELECT requests.*,
			buildings.address AS address,
			to_json(members) AS member,
			json_agg(json_build_object('id', panoramas.id, 'url', panoramas.url, 'date', panoramas.date)) AS panoramas
		FROM requests
		LEFT JOIN buildings ON requests.building_id = buildings.id
		LEFT JOIN members ON requests.member_id = members.id
		LEFT JOIN panoramas ON requests.id = panoramas.join_request_id
		GROUP BY requests.id, buildings.id, members.id
		ORDER BY date DESC`
	);
}
