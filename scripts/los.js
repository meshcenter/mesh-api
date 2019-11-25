const fetch = require("node-fetch");
require("dotenv").config();
const { performQuery } = require("./db");

checkLOS().then(() => process.exit(0));

async function checkLOS() {
	const requests = await getRequests();
	for (let i = 0; i < requests.length - 9; i += 10) {
		const request = requests[i];
		const request2 = requests[i + 1];
		const request3 = requests[i + 2];
		const request4 = requests[i + 3];
		const request5 = requests[i + 4];
		const request6 = requests[i + 5];
		const request7 = requests[i + 6];
		const request8 = requests[i + 7];
		const request9 = requests[i + 8];
		const request10 = requests[i + 9];
		try {
			await Promise.all([
				handleRequest(i, request),
				handleRequest(i + 1, request2),
				handleRequest(i + 2, request3),
				handleRequest(i + 3, request4),
				handleRequest(i + 4, request5),
				handleRequest(i + 5, request6),
				handleRequest(i + 6, request7),
				handleRequest(i + 7, request8),
				handleRequest(i + 8, request9),
				handleRequest(i + 9, request10)
			]);
		} catch (error) {
			console.log(error.message);
		}
	}
}

async function handleRequest(i, request) {
	console.log(i);
	if (!request.bin) return;
	if (request.roof_access !== "yes") return;
	if (request.bin < 0 || request.bin % 1000000 === 0) return;
	const url = `https://api.nycmesh.net/v1/los?bin=${request.bin}`;
	console.log(url);
	const losResponse = await fetch(url);
	const {
		visibleOmnis,
		visibleSectors,
		visibleRequests,
		error
	} = await losResponse.json();
	if (error) {
		throw Error(error);
	}
	if (visibleOmnis.length) {
		for (let j = 0; j < visibleOmnis.length; j++) {
			const hub = visibleOmnis[j];
			console.log(`${request.id} <-> ${hub.id}`);
		}
	}
	if (visibleSectors.length) {
		for (let j = 0; j < visibleSectors.length; j++) {
			const hub = visibleSectors[j];
			console.log(`${request.id} <-> ${hub.id}`);
		}
	}
	if (visibleRequests.length) {
		for (let k = 0; k < visibleRequests.length; k++) {
			const potentialNode = visibleRequests[k];
			console.log(`${request.id} <-> ${potentialNode.id}`);
		}
	}
}

async function getRequests() {
	return performQuery(
		`SELECT requests.*,
			buildings.bin,
			buildings.lat,
			buildings.lng,
			buildings.alt,
			json_agg(json_build_object('id', panoramas.id, 'url', panoramas.url, 'date', panoramas.date)) AS panoramas
		FROM requests
		LEFT JOIN buildings ON requests.building_id = buildings.id
		LEFT JOIN panoramas ON requests.id = panoramas.request_id
		GROUP BY requests.id, buildings.id
		ORDER BY requests.id`
	);
}
