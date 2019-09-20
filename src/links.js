import pathToRegexp from "path-to-regexp";
import { performQuery } from "./db";
import { createResponse } from "./utils";

export async function handler(event) {
	if (event.httpMethod === "OPTIONS") {
		return createResponse(200);
	}

	try {
		if (event.httpMethod === "GET") {
			if (event.path === "/links/") {
				return createResponse(404, {
					error: {
						message: `Unrecognized request URL (${event.httpMethod} ${event.path}). If you are trying to list objects, remove the trailing slash. If you are trying to retrieve an object, pass a valid identifier.`
					}
				});
			}

			if (event.path === "/links") {
				const links = await getLinks();
				return createResponse(200, links);
			}
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

async function getLinks(id) {
	return performQuery(
		`SELECT
			links.*,
			json_agg(devices) as devices,
			json_agg(device_types) as device_types,
			json_agg(nodes) as nodes
		FROM
			links
			JOIN devices ON devices.id = links.device_a_id
				OR devices.id = links.device_b_id
			JOIN device_types ON device_types.id = devices.device_type_id
			JOIN nodes ON nodes.id = devices.node_id
			GROUP BY
				links.id`
	);
}
