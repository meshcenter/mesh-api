import { performQuery as performLosQuery } from "./db/los";
import { performQuery } from "./db";
import { createResponse } from "./utils";

export async function handler(event, context) {
	const { queryStringParameters } = event;
	const { bin } = queryStringParameters;

	try {
		// TODO: One query, and use range of device
		const omnis = await performQuery(
			`SELECT
			nodes.id,
			buildings.bin
		FROM
			nodes
			JOIN buildings ON nodes.building_id = buildings.id
			JOIN devices ON devices.node_id = nodes.id
			JOIN device_types ON devices.device_type_id = device_types.id
		WHERE
			device_types.name = 'Omni'
			AND devices.status = 'active'
			AND nodes.status = 'active'
		GROUP BY
			nodes.id,
			buildings.bin`
		);

		const sectors = await performQuery(
			`SELECT
			nodes.id,
			buildings.bin
		FROM
			nodes
			JOIN buildings ON nodes.building_id = buildings.id
			JOIN devices ON devices.node_id = nodes.id
			JOIN device_types ON devices.device_type_id = device_types.id
		WHERE
			device_types.name IN ('LBE120', 'SN1Sector1', 'SN1Sector2')
			AND devices.status = 'active'
			AND nodes.status = 'active'
		GROUP BY
			nodes.id,
			buildings.bin`
		);

		const requests = await performQuery(
			`SELECT
				requests.id,
				buildings.bin
			FROM
				requests
				JOIN buildings ON requests.building_id = buildings.id
			WHERE
				requests.id IN (3946, 1932, 1933, 1084)
			GROUP BY
				requests.id,
				buildings.bin`
		);

		const buildingMidpoint = await getBuildingMidpoint(bin);
		const buildingHeight = await getBuildingHeight(bin);
		const omnisInRange = await getNodesInRange(omnis, bin, 0.4 * 5280); // 0.4 miles
		const sectorsInRange = await getNodesInRange(sectors, bin, 1.5 * 5280); // 1.5 miles
		const requestsInRange = await getNodesInRange(
			requests,
			bin,
			4 * 5280, // 4 miles
			true
		);

		// TODO: Dedupe code
		const visibleOmnis1 = [];
		for (let i = 0; i < omnisInRange.length; i++) {
			const hub = omnisInRange[i];
			const { midpoint, alt } = hub;
			if (parseInt(hub.bin) % 1000000 === 0) continue; // Invalid bin
			const { coordinates } = await JSON.parse(midpoint);
			const [lat, lng] = coordinates;
			const hubMidpoint = [lat, lng];
			const hubHeight = await getBuildingHeight(hub.bin);
			const intersections = await getIntersections(
				buildingMidpoint,
				buildingHeight,
				hubMidpoint,
				hubHeight
			);

			// Ignore intersections with the target building
			// TODO: do this better (in sql?)
			const filteredIntersections = intersections.filter(
				intersection => intersection.bin !== bin
			);
			if (!filteredIntersections.length) {
				visibleOmnis1.push(hub);
			}
		}
		const visibleOmnis = visibleOmnis1.filter(node => node.bin !== bin);

		// TODO: Dedupe code
		let visibleSectors1 = [];
		for (let i = 0; i < sectorsInRange.length; i++) {
			const hub = sectorsInRange[i];
			const { midpoint, alt } = hub;
			if (parseInt(hub.bin) % 1000000 === 0) continue; // Invalid bin
			const { coordinates } = await JSON.parse(midpoint);
			const [lat, lng] = coordinates;
			const hubMidpoint = [lat, lng];
			const hubHeight = await getBuildingHeight(hub.bin);
			const intersections = await getIntersections(
				buildingMidpoint,
				buildingHeight,
				hubMidpoint,
				hubHeight
			);

			// Ignore intersections with the target building
			// TODO: do this better (in sql?)
			const filteredIntersections = intersections.filter(
				intersection => intersection.bin !== bin
			);
			if (!filteredIntersections.length) {
				visibleSectors1.push(hub);
			}
		}
		const visibleSectors = visibleSectors1.filter(node => node.bin !== bin);

		// TODO: Dedupe code
		const visibleRequests1 = [];
		for (let i = 0; i < requestsInRange.length; i++) {
			const request = requestsInRange[i];
			const { midpoint, alt } = request;
			if (parseInt(request.bin) % 1000000 === 0) continue; // Invalid bin
			const { coordinates } = await JSON.parse(midpoint);
			const [lat, lng] = coordinates;
			const requestMidpoint = [lat, lng];
			const requestHeight = await getBuildingHeight(request.bin);
			const intersections = await getIntersections(
				buildingMidpoint,
				buildingHeight,
				requestMidpoint,
				requestHeight
			);

			// Ignore intersections with the target building
			// TODO: do this better (in sql?)
			const filteredIntersections = intersections.filter(
				intersection => intersection.bin !== bin
			);

			if (!filteredIntersections.length) {
				visibleRequests1.push(request);
			}
		}
		const visibleRequests = visibleRequests1.filter(
			request => request.bin !== bin
		);

		return createResponse(200, {
			buildingHeight,
			visibleOmnis,
			visibleSectors,
			visibleRequests,
			omnisInRange,
			sectorsInRange
		});
	} catch (error) {
		return createResponse(500, {
			error: error.message
		});
	}
}

async function getBuildingMidpoint(bin) {
	const text =
		"SELECT ST_AsText(ST_Centroid((SELECT geom FROM ny WHERE bldg_bin = $1)))";
	const values = [bin];
	const res = await performLosQuery(text, values);
	if (!res.length) throw `Could not find building data for ${bin} (1)`;
	const { st_astext } = res[0];
	if (!st_astext) throw `Could not find building data for ${bin} (2)`;
	const rawText = st_astext.replace("POINT(", "").replace(")", ""); // Do this better
	const [lat, lng] = rawText.split(" ");
	return [parseFloat(lat), parseFloat(lng)];
}

async function getBuildingHeight(bin) {
	const text = "SELECT ST_ZMax((SELECT geom FROM ny WHERE bldg_bin = $1))";
	const values = [bin];
	const res = await performLosQuery(text, values);
	if (!res.length) throw `Could not find building data for ${bin} (3)`;
	const { st_zmax } = res[0];
	const offset = 4;
	return parseInt(st_zmax) + offset;
}

async function getNodesInRange(nodes, bin, range, isRequests) {
	const nodeBins = nodes
		.map(node => node.bin)
		.filter(bin => bin % 1000000 !== 0);
	const losNodesInRange = await performLosQuery(
		`SELECT
				bldg_bin as bin,
				ST_AsGeoJSON(ST_Centroid(geom)) as midpoint
			FROM (
				SELECT
					*
				FROM
					ny
				WHERE
					bldg_bin = ANY ($1)) AS hubs
			WHERE
				ST_DWithin (ST_Centroid(geom), (
						SELECT
							ST_Centroid(geom)
						FROM
							ny
						WHERE
							bldg_bin = $2), $3)`,
		[nodeBins, bin, range]
	);
	const losNodesInRangeMap = losNodesInRange.reduce((acc, cur) => {
		acc[cur.bin] = cur;
		return acc;
	}, {});

	const nodesInRangeBins = losNodesInRange.map(node => node.bin);

	const nodesInRange = isRequests
		? await getRequestsFromBins(nodesInRangeBins)
		: await getNodesFromBins(nodesInRangeBins);
	const nodesInRangeWithMidpoint = nodesInRange.map(node => ({
		...node,
		midpoint: losNodesInRangeMap[node.bin].midpoint
	}));

	return nodesInRangeWithMidpoint;
}

async function getIntersections(midpoint1, height1, midpoint2, height2) {
	const [x1, y1] = midpoint1;
	const [x2, y2] = midpoint2;
	// const distance = await getDistance(midpoint1, midpoint2);
	// const FREQUENCY = 5; // GHz
	// const MILES_FEET = 5280;
	// const fresnelRadius =
	// 	72.05 * Math.sqrt(distance / MILES_FEET / (4 * FREQUENCY));
	const text = `SELECT
				a.bldg_bin as bin
			FROM
				ny AS a
			WHERE
				ST_3DIntersects (a.geom, ST_SetSRID(ST_GeomFromText('LINESTRINGZ(${x1} ${y1} ${height1}, ${x2} ${y2} ${height2})'), 2263))
			LIMIT 3`;
	const res = await performLosQuery(text);
	if (!res) throw "Failed to get intersections";
	return res;
}

// TODO: 3D
async function getDistance(point1, point2) {
	const [x1, y1] = point1;
	const [x2, y2] = point2;
	const text = `SELECT ST_Distance(
			'POINT (${x1} ${y1})'::geometry,
			'POINT (${x2} ${y2})'::geometry
		);`;
	const res = await performLosQuery(text);
	if (!res.length) throw "Failed to calculate distance";
	const { st_distance } = res[0];
	return st_distance;
}

async function getNodesFromBins(bins) {
	return performQuery(
		`SELECT
				nodes.*,
				buildings.bin,
				json_agg(json_build_object('id', devices.id, 'type', device_types, 'lat', devices.lat, 'lng', devices.lng, 'alt', devices.alt, 'azimuth', devices.azimuth, 'status', devices.status, 'name', devices.name, 'ssid', devices.ssid, 'notes', devices.notes, 'create_date', devices.create_date, 'abandon_date', devices.abandon_date)) AS devices
			FROM
				nodes
				JOIN buildings ON buildings.id = nodes.building_id
				LEFT JOIN devices ON nodes.id = devices.node_id
				LEFT JOIN device_types ON device_types.id IN (devices.device_type_id)
			WHERE
				buildings.bin = ANY ($1)
			GROUP BY
				nodes.id,
				buildings.id`,
		[bins]
	);
}

async function getRequestsFromBins(bins) {
	return performQuery(
		`SELECT
				requests.*,
				buildings.address,
				buildings.bin,
				buildings.lat,
				buildings.lng,
				buildings.alt
			FROM
				requests
				JOIN buildings ON buildings.id = requests.building_id
			WHERE
				buildings.bin = ANY ($1)
			GROUP BY
				requests.id,
				buildings.id`,
		[bins]
	);
}
