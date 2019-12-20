import fetch from "node-fetch";
import { getLos, getBuildingHeight } from "./los";
import { requestMessage } from "../slack";
import { performQuery } from ".";

const getRequestQuery = `SELECT
	requests.*,
	to_json(buildings) AS building,
	to_json(members) AS member,
	json_agg(json_build_object('id', panoramas.id, 'url', panoramas.url, 'date', panoramas.date)) AS panoramas
FROM
	requests
	JOIN buildings ON requests.building_id = buildings.id
	JOIN members ON requests.member_id = members.id
	LEFT JOIN panoramas ON requests.id = panoramas.request_id
WHERE
	requests.id = $1
GROUP BY
	requests.id,
	buildings.id,
	members.id`;

export async function getRequest(id) {
	if (!Number.isInteger(parseInt(id, 10))) throw new Error("Bad params");
	const [request] = await performQuery(getRequestQuery, [id]);
	if (!request) throw new Error("Not found");
	return request;
}

const getRequestsQuery = `SELECT
	requests.*,
	buildings.address AS address,
	to_json(members) AS member,
	json_agg(json_build_object('id', panoramas.id, 'url', panoramas.url, 'date', panoramas.date)) AS panoramas
FROM
	requests
	LEFT JOIN buildings ON requests.building_id = buildings.id
	LEFT JOIN members ON requests.member_id = members.id
	LEFT JOIN panoramas ON requests.id = panoramas.request_id
GROUP BY
	requests.id,
	buildings.id,
	members.id
ORDER BY
	date DESC`;

export async function getRequests() {
	return performQuery(getRequestsQuery);
}

export async function createRequest(request) {
	const { name, email, phone, address, roofAccess } = request;

	// Geocode address
	let { lat, lng, bin } = request;
	try {
		const buildingInfo = await getBuildingInfo(address, lat, lng);
		lat = lat || buildingInfo.lat;
		lng = lng || buildingInfo.lng;
		bin = bin || buildingInfo.bin;
	} catch (error) {
		console.log(error);
	}

	// Look up building by bin
	let [building] = await performQuery(
		"SELECT * FROM buildings WHERE bin = $1",
		[request.bin]
	);

	// Look up building by address
	if (!building) {
		[building] = await performQuery(
			"SELECT * FROM buildings WHERE address = $1",
			[address]
		);
	}

	// Create building if new
	if (!building) {
		const buildingHeight = await getBuildingHeight(bin);
		const [building] = await performQuery(
			"INSERT INTO buildings (address, lat, lng, alt, bin) VALUES ($1, $2, $3, $4, $5) RETURNING *",
			[address, lat, lng, buildingHeight, bin]
		);
	}

	// Look up member by email
	let [member] = await performQuery(
		"SELECT * FROM members WHERE email = $1",
		[email]
	);

	// Create member if new
	if (!member) {
		[member] = await performQuery(
			"INSERT INTO members (name, email, phone) VALUES ($1, $2, $3) RETURNING *",
			[name, email, phone]
		);
	}

	// Insert request
	const now = new Date();
	const [dbRequest] = await performQuery(
		"INSERT INTO requests (date, roof_access, member_id, building_id) VALUES ($1, $2, $3, $4) RETURNING *",
		[now, roofAccess, member.id, building.id]
	);

	// Send Slack message
	try {
		const { visibleSectors, visibleOmnis } = await getLos(bin);
		const visibleNodes = [...visibleSectors, ...visibleOmnis];
		const slackRequest = {
			...dbRequest,
			id: request.spreadsheetId || dbRequest.id // Temp hack to keep in sync with spreadsheet
		};
		await requestMessage(slackRequest, building, member, visibleNodes);
	} catch (error) {
		console.log(error);
	}

	return dbRequest;
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
		throw text;
	}

	return text; // external ticket id of the newly-created ticket
}

async function getBuildingInfo(address, lat = 0, lng = 0) {
	const URIaddress = encodeURIComponent(address);
	const URL = `https://geosearch.planninglabs.nyc/v1/search?text=${URIaddress}`;
	const binRes = await fetch(URL);
	const { features } = await binRes.json();

	if (!features.length) {
		return {};
	}

	const [feature] = features.sort(sortByDistance);
	const [lng, lat] = feature.geometry.coordinates;
	const { pad_bin } = feature.properties;

	return {
		lat,
		lng,
		bin: pad_bin
	};

	function sortByDistance(a, b) {
		return (
			distance(a.geometry.coordinates, [lng, lat]) -
			distance(b.geometry.coordinates, [lng, lat])
		);
	}

	function distance(a, b) {
		const xDiff = a[0] - b[0];
		const yDiff = a[1] - b[1];
		return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
	}
}
