import pathToRegexp from "path-to-regexp";
import fetch from "node-fetch";
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
			const request = await createRequest(JSON.parse(event.body));
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
		bin,
		roofAccess
	} = request;

	// Look up or create member
	let members = await performQuery("SELECT * FROM members WHERE email = $1", [
		email
	]);
	if (!members.length) {
		members = await performQuery(
			"INSERT INTO members (name, email, phone) VALUES ($1, $2, $3) RETURNING *",
			[name, email, phone]
		);
	}

	// Look up or create building
	let buildings = await performQuery(
		"SELECT * FROM buildings WHERE address = $1",
		[address]
	);
	if (!buildings.length) {
		buildings = await performQuery(
			"INSERT INTO buildings (address, lat, lng, alt, bin) VALUES ($1, $2, $3, $4, $5) RETURNING *",
			[address, lat, lng, alt, bin]
		);
	}

	const [member] = members;
	const [building] = buildings;
	const date = new Date();

	const [newRequest] = await performQuery(
		"INSERT INTO requests (date, roof_access, member_id, building_id) VALUES ($1, $2, $3, $4) RETURNING *",
		[date, roofAccess, member.id, building.id]
	);

	// This doesn't work because osTicket returns the external ticket id
	// which doesn't do anything... we need the internal ticket id.
	const ticketId = await createTicket(newRequest, building, member);

	const [updatedRequest] = await performQuery(
		"UPDATE requests SET osticket_id = $1 WHERE id = $2 RETURNING *",
		[ticketId, newRequest.id]
	);

	await createSlackPost(request, updatedRequest, building, member, ticketId);

	return updatedRequest;
}

// https://docs.osticket.com/en/latest/Developer%20Documentation/API/Tickets.html
async function createTicket(request, building, member) {
	const { id, date, roofAccess } = request;
	const { address, lat, lng } = building;
	const { name, email, phone } = member;

	const subject = `NYC Mesh Install`;
	const message = address;

	const url = "http://devsupport.nycmesh.net/api/http.php/tickets.json";
	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-API-Key": process.env.OSTICKET_API_KEY
		},
		body: JSON.stringify({
			email,
			name,
			subject,
			message,
			phone
		})
	});

	const text = await response.text();
	if (response.status !== 201) {
		throw new Error(text);
	}

	return text; // external ticket id of the newly-created ticket
}

// TODO: Simplify
async function createSlackPost(
	userRequest,
	request,
	building,
	member,
	ticketId
) {
	const { address, lat, lng, alt } = building;
	const { id, roof_access } = request;

	// Check line of sight
	const { bin } = userRequest; // Work around for incorrect BINs in db
	const losUrl = `https://los.nycmesh.net/.netlify/functions/los?bin=${bin}`;
	const losResponse = await fetch(losUrl);
	const losResults = await losResponse.json();
	const { visibleHubs } = losResults;
	const hubsString = visibleHubs.map(hub => hub.name).join(", ");

	await fetch(process.env.SLACK_WEBHOOK_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			blocks: [
				{
					type: "section",
					text: {
						type: "mrkdwn",
						text: `New join request:\n*<https://dashboard.nycmesh.net/requests/${id}|${address}>*`
					}
				},
				{
					type: "section",
					text: {
						type: "mrkdwn",
						text: `*Roof Access:* ${roof_access}\n*Building Height:* ${alt}m\n*Line of Sight:* ${hubsString}`
					}
				},
				{
					type: "actions",
					elements: [
						{
							type: "button",
							text: {
								type: "plain_text",
								text: "View Earth"
							},
							url: `https://earth.google.com/web/search/${encodeURIComponent(
								address
							)}/@${lat},${lng},${alt}a,100d,45y,0h,45t,0r`
						},
						{
							type: "button",
							text: {
								type: "plain_text",
								text: "View Ticket"
							},
							url: `https://devsupport.nycmesh.net/scp/tickets.php?id=${ticketId}`
						}
					]
				}
			]
		})
	});
}
