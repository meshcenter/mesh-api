import pathToRegexp from "path-to-regexp";
import { performQuery } from "./db";
import { createResponse, checkAuth } from "./utils";

export async function handler(event) {
	if (event.httpMethod === "OPTIONS") {
		return createResponse(200);
	}

	// Handle request
	try {
		if (event.httpMethod === "GET") {
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

		if (event.httpMethod === "POST") {
			const request = await createRequest(event.body);
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

async function createRequest(request) {
	const {
		name,
		email,
		phone,
		address,
		lat = 0,
		lng = 0,
		alt = 0,
		roofAccess
	} = JSON.parse(request);

	// Look up or create member
	let members = await performQuery(
		`SELECT id FROM members WHERE email = $1`,
		[email]
	);
	if (!members.length) {
		members = await performQuery(
			`INSERT INTO members (name, email, phone) VALUES ($1, $2, $3) RETURNING *`,
			[name, email, phone]
		);
	}

	// Look up or create building
	let buildings = await performQuery(
		`SELECT id FROM buildings WHERE address = $1`,
		[address]
	);
	if (!buildings.length) {
		buildings = await performQuery(
			`INSERT INTO buildings (address, lat, lng, alt) VALUES ($1, $2, $3, $4) RETURNING *`,
			[address, lat, lng, alt]
		);
	}

	const [member] = members;
	const [building] = buildings;
	const date = new Date();

	const [newRequest] = await performQuery(
		`INSERT INTO requests (date, roof_access, member_id, building_id) VALUES ($1, $2, $3, $4) RETURNING *`,
		[date, roofAccess, member.id, building.id]
	);

	return newRequest;
}

const createMessage = request => `
timestamp: ${request.date}
id: ${request.id}
name: ${request.name}
email: ${request.email}
phone: ${request.phone}
address: ${request.address}
`;

async function osticket(request) {
	const {
		id,
		name,
		email,
		address,
		phone,
		roofAccess,
		lat,
		lng,
		date
	} = request;

	const subject = roofAccess
		? `NYC Mesh Rooftop Install ${id}`
		: `NYC Mesh Install ${id}`;

	const message = createMessage(request);
	const url = "https://support.nycmesh.net/api/http.php/tickets.json";
	var data = {
		subject: subject,
		message: message,
		id: id,
		email: email,
		name: name,
		phone: phone,
		location: address,
		rooftop: roofAccess,
		// ncl: ncl,
		ip: "*.*.*.*"
	};

	var options = {
		method: "POST",
		headers: {
			"X-API-Key": process.env.OSTICKET_API_KEY
		},
		body: JSON.stringify(data)
	};

	try {
		const response = await fetch(url, options);

		// TODO: Handle API error
	} catch (e) {
		// TODO: Handle error
	}
}
