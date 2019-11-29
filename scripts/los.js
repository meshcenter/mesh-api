const fetch = require("node-fetch");
require("dotenv").config();
const { performQuery } = require("./db");
const ProgressBar = require("./ProgressBar");

checkLOS().then(() => process.exit(0));

let bar;
let processed = 0;
let notFound = 0;

async function checkLOS() {
	const requests = await getRequests();
	bar = new ProgressBar(requests.length);
	bar.render();
	for (let i = 0; i < requests.length - 14; i += 15) {
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
		const request11 = requests[i + 10];
		const request12 = requests[i + 11];
		const request13 = requests[i + 12];
		const request14 = requests[i + 13];
		const request15 = requests[i + 14];
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
				handleRequest(i + 9, request10),
				handleRequest(i + 10, request11),
				handleRequest(i + 11, request12),
				handleRequest(i + 12, request13),
				handleRequest(i + 13, request14),
				handleRequest(i + 14, request15)
			]);
		} catch (error) {
			console.log(error.message);
		}
	}
	console.log("\n");
	console.log(`${processed} buildings processed`);
	console.log(`${notFound} buildings not found`);
}

async function handleRequest(i, request) {
	bar.curr = i;
	bar.render();
	if (!request.bin) return;
	if (request.roof_access !== "yes") return;
	if (request.bin < 0 || request.bin % 1000000 === 0) return;
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
