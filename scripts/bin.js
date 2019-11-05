require("dotenv").config();
const fetch = require("node-fetch");
const { performQuery } = require("./db");

lookupBins().then(() => process.exit(0));

async function lookupBins() {
	const buildings = await getBuildings();
	for (var i = buildings.length - 1; i >= 0; i--) {
		const building = buildings[i];
		const bin = await getBIN(building);
		if (bin && bin !== building.bin) {
			console.log(building.address);
			console.log(`${building.bin} => ${bin}`);
			await setBin(building.id, bin);
		}
	}
}

async function getBIN({ address, lat, lng }) {
	if (!address) return -1;
	address = address.toLowerCase();
	if (address.includes(", md")) return -1;
	if (address.includes(", canada")) return -1;
	if (address.includes(", ca")) return -1;
	if (address.includes(", ca")) return -1;
	if (address.includes(", ca")) return -1;
	if (address.includes("nj, usa")) return -1;
	if (address.includes(", nj")) return -1;
	if (address.includes(",nj")) return -1;
	if (address.includes(" nj 0")) return -1;
	if (address.indexOf("nj") === address.length - 2) return -1;

	if (!parseInt(address[0]) || !address.includes(" ")) {
		console.log(`Bad address: ${address}`);
		return -1;
	}

	const URIaddress = encodeURIComponent(address);
	const url = `https://geosearch.planninglabs.nyc/v1/search?text=${URIaddress}&focus.point.lat=${parseFloat(
		lat
	)}&focus.point.lon=${parseFloat(lng)}`;
	const binRes = await fetch(url);
	const resJSON = await binRes.json();
	const { features } = resJSON;
	if (!features.length) return -1;

	// Choose closest match
	features.sort(
		(a, b) =>
			distance(a.geometry.coordinates, [lng, lat]) -
			distance(b.geometry.coordinates, [lng, lat])
	);

	const { pad_bin: bin, label } = features[0].properties;
	return parseInt(bin);

	function distance(a, b) {
		const xDiff = a[0] - b[0];
		const yDiff = a[1] - b[1];
		return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
	}
}

async function getBuildings() {
	return performQuery(
		`SELECT
			buildings.*,
			JSON_AGG(DISTINCT nodes.*) AS nodes
		FROM
			buildings
			LEFT JOIN nodes ON nodes.building_id = buildings.id
			LEFT JOIN requests ON requests.building_id = buildings.id
		GROUP BY
			buildings.id
		ORDER BY
			id DESC`
	);
}

async function setBin(building_id, bin) {
	return performQuery(`UPDATE buildings SET bin = $1 WHERE id = $2`, [
		bin,
		building_id
	]);
}
