const fetch = require("node-fetch");
require("dotenv").config();
const { performQuery } = require("./db");

checkLOS().then(() => process.exit(0));

async function checkLOS() {
	const requests = await getRequests();
	for (let i = 0; i < requests.length; i++) {
		const request = requests[i];
		if (!request.bin) continue;
		if (request.roof_access !== "yes") continue;
		if (!request.panoramas || !request.panoramas.filter(p => p).length)
			continue;
		console.log(request.id, request.address);
		try {
			const losResponse = await fetch(
				`https://los.nycmesh.net/.netlify/functions/los?bin=${request.bin}`
			);
			const response = await losResponse.json();
			const { visibleHubs, errorMessage } = response;
			if (errorMessage) {
				console.log(errorMessage);
			}
			if (visibleHubs.length) {
				for (let j = 0; j < visibleHubs.length; j++) {
					const hub = visibleHubs[j];
					console.log(hub.name);
					const [building] = await buildingFromBin(hub.bin);

					// Handle bad BINs (temporary solution)
					const latDiff = building.lat - request.lat;
					const lngDiff = building.lng - request.lng;
					const cSquared = latDiff * latDiff + lngDiff * lngDiff;
					const distance = Math.sqrt(cSquared);
					if (distance > 0.04) continue;

					await saveLOS(
						request.building_id,
						building.id,
						request.lat,
						request.lng,
						request.alt,
						building.lat,
						building.lng,
						building.alt
					);
				}
			}
		} catch (error) {
			console.log(error);
		}
	}
}

async function getRequests() {
	return performQuery(
		`SELECT requests.*,
			buildings.*,
			json_agg(json_build_object('id', panoramas.id, 'url', panoramas.url, 'date', panoramas.date)) AS panoramas
		FROM requests
		LEFT JOIN buildings ON requests.building_id = buildings.id
		LEFT JOIN panoramas ON requests.id = panoramas.join_request_id
		GROUP BY requests.id, buildings.id
		ORDER BY requests.id DESC`
	);
}

async function buildingFromBin(bin) {
	return performQuery(
		`SELECT *
		FROM buildings
		WHERE bin = $1 LIMIT 1`,
		[bin]
	);
}

async function nodesFromBin(bin) {
	return performQuery(
		`SELECT
			*
		FROM
			nodes
			LEFT JOIN buildings ON buildings.id = nodes.building_id
			WHERE buildings.bin = $1`,
		[bin]
	);
}

async function saveLOS(
	building_a_id,
	building_b_id,
	lat_a,
	lng_a,
	alt_a,
	lat_b,
	lng_b,
	alt_b
) {
	return performQuery(
		`INSERT INTO los (building_a_id, building_b_id, lat_a, lng_a, alt_a, lat_b, lng_b, alt_b) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		[building_a_id, building_b_id, lat_a, lng_a, alt_a, lat_b, lng_b, alt_b]
	);
}
