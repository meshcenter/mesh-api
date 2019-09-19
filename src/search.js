import pathToRegexp from "path-to-regexp";
import { performQuery } from "./db";
import { createResponse, checkAuth } from "./utils";

export async function handler(event) {
	try {
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

		if (event.httpMethod === "GET") {
			if (event.path === "/search/") {
				return createResponse(404, {
					error: {
						message: `Unrecognized request URL (${event.httpMethod} ${event.path}).`
					}
				});
			}

			if (event.path === "/search") {
				const { s } = event.queryStringParameters;
				const nodes = await searchNodes(s);
				const buildings = await searchBuildings(s);
				const requests = await searchRequests(s);
				const members = await searchMembers(s);
				return createResponse(200, {
					nodes,
					buildings,
					members,
					requests
				});
			}
		}

		return createResponse(400);
	} catch (error) {
		return createResponse(500, {
			error: {
				message: error.message
			}
		});
	}
}

function searchNodes(query) {
	return performQuery(
		`SELECT
			*
		FROM
			nodes
		WHERE
			CAST(id AS VARCHAR) = $1
				OR name ILIKE $2
				OR notes ILIKE $3
		GROUP BY
			id
		LIMIT 5`,
		[query, `${query}%`, `%${query}%`]
	);
}

function searchBuildings(query) {
	return performQuery(
		`SELECT
			*
		FROM
			buildings
		WHERE address ILIKE $1
				OR notes ILIKE $2
			GROUP BY
				id
		LIMIT 5`,
		[`${query}%`, `%${query}%`]
	);
}

function searchRequests(query) {
	return performQuery(
		`SELECT
			join_requests.*,
			to_json(buildings) AS building,
			to_json(members) AS member
		FROM
			join_requests
		JOIN buildings ON join_requests.building_id = buildings.id
		JOIN members ON join_requests.member_id = members.id
		WHERE buildings.address ILIKE $1
			OR members.name ILIKE $1
			OR members.email ILIKE $1
			OR notes ILIKE $2
		GROUP BY
			join_requests.id,
			buildings.id,
			members.id
		LIMIT 5`,
		[`${query}%`, `%${query}%`]
	);
}

function searchMembers(query) {
	return performQuery(
		`SELECT *
		FROM
			members
		WHERE name ILIKE $1
			OR name ILIKE $2
			OR email ILIKE $3
		LIMIT 5`,
		[`${query}%`, ` ${query}%`, `${query}%`]
	);
}
