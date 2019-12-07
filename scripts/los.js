const fetch = require("node-fetch");
require("dotenv").config();
const { performQuery } = require("./db");
const ProgressBar = require("./ProgressBar");

checkLOS().then(() => process.exit(0));

const QUEUE_SIZE = 5;

let bar;
let processed = 0;
let notFound = 0;
let total = 0;

async function checkLOS() {
	const requests = await getRequests();
	bar = new ProgressBar(requests.length);
	bar.render();

	await Promise.all(
		new Array(QUEUE_SIZE).fill("asdf").map(async () => {
			try {
				let nextRequest;
				while ((nextRequest = requests.pop())) {
					await handleRequest(nextRequest);
					bar.curr = ++total;
					bar.render();
				}
			} catch (error) {
				console.log(error.message);
			}
		})
	);

	console.log("\n");
	console.log(`${processed} buildings processed`);
	console.log(`${notFound} buildings not found`);
}

async function handleRequest(request) {
	let skip = false;
	if (!request.bin) skip = true;
	if (!request.roof_access) skip = true;
	if (request.bin < 0 || request.bin % 1000000 === 0) skip = true;
	if (
		request.device_types.filter(
			device_type =>
				device_type &&
				["Omni", "LBE120", "SN1Sector1", "SN1Sector2"].indexOf(
					device_type.name
				) > -1
		).length
	)
		skip = true;
	if ([3946, 1932, 1933].indexOf(request.id) > -1) skip = true;
	if (skip) {
		processed++;
		return;
	}

	const url = `http://localhost:9000/v1/los?bin=${request.bin}`;
	const losResponse = await fetch(url);
	const {
		visibleOmnis,
		visibleSectors,
		visibleRequests,
		error
	} = await losResponse.json();
	if (error) {
		if (error === "Not found") {
			notFound++;
			return;
		}
		throw Error(error);
	} else {
		processed++;
	}
}

async function getRequests() {
	return performQuery(
		`SELECT
	requests.*,
	buildings.bin,
	buildings.lat,
	buildings.lng,
	buildings.alt,
	json_agg(json_build_object('id', panoramas.id, 'url', panoramas.url, 'date', panoramas.date)) AS panoramas,
	json_agg(device_types.*) AS device_types
FROM
	requests
	LEFT JOIN buildings ON requests.building_id = buildings.id
	LEFT JOIN panoramas ON requests.id = panoramas.request_id
	LEFT JOIN nodes ON nodes.building_id = buildings.id
	LEFT JOIN devices ON devices.node_id = nodes.id
	LEFT JOIN device_types ON devices.device_type_id = device_types.id
WHERE
	requests.status = 'active'
GROUP BY
	requests.id,
	buildings.id
ORDER BY
	requests.id`
	);
}
