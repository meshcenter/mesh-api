const fetch = require("node-fetch");
require("dotenv").config();
const { performQuery } = require("./db");

checkLOS().then(() => process.exit(0));

async function checkLOS() {
	const requests = await getRequests();
	for (let i = 0; i < requests.length; i++) {
		console.log(i);
		const request = requests[i];
		// if (request.id < 4856) continue;
		if (!request.bin) continue;
		if (request.roof_access !== "yes") continue;
		if (request.bin < 0 || request.bin % 1000000 === 0) continue;
		try {
			const url = `http://localhost:9000/los?bin=${request.bin}`;
			console.log(request.bin);
			const losResponse = await fetch(url);
			const response = await losResponse.json();
			const {
				visibleOmnis,
				visibleSectors,
				visibleRequests,
				error
			} = response;
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
		} catch (error) {
			console.log(error.message);
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
