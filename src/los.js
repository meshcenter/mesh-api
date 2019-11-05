import { performQuery as performLosQuery } from "./db/los";
import { performQuery } from "./db";

export async function handler(event, context) {
	const { queryStringParameters } = event;
	const { bin } = queryStringParameters;

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
			device_types.name = 'LBE120'
			AND devices.status = 'active'
		GROUP BY
			nodes.id,
			buildings.bin`
	);

	const buildingMidpoint = await getBuildingMidpoint(bin);
	const buildingHeight = await getBuildingHeight(bin);
	const omnisInRange = await getNodesInRange(omnis, bin, 0.5 * 5280); // 0.5 miles
	const sectorsInRange = await getNodesInRange(sectors, bin, 5280); // 1 mile

	// TODO: Dedupe code
	const visibleOmnis = [];
	for (var i = 0; i < omnisInRange.length; i++) {
		const hub = omnisInRange[i];
		const { bin, midpoint, alt } = hub;
		if (parseInt(bin) % 1000000 === 0) continue; // Invalid bin
		const { coordinates } = await JSON.parse(midpoint);
		const [lat, lng] = coordinates;
		const hubMidpoint = [lat, lng];
		const hubHeight = 100;
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
			visibleOmnis.push(hub);
		}
	}

	// TODO: Dedupe code
	const visibleSectors = [];
	for (var i = 0; i < sectorsInRange.length; i++) {
		const hub = sectorsInRange[i];
		const { bin, midpoint, alt } = hub;
		if (parseInt(bin) % 1000000 === 0) continue; // Invalid bin
		const { coordinates } = await JSON.parse(midpoint);
		const [lat, lng] = coordinates;
		const hubMidpoint = [lat, lng];
		const hubHeight = 100;
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
			visibleSectors.push(hub);
		}
	}

	return {
		statusCode: 200,
		body: JSON.stringify(
			{
				buildingHeight,
				visibleOmnis,
				visibleSectors,
				omnisInRange,
				sectorsInRange
			},
			null,
			2
		)
	};

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
		const text =
			"SELECT ST_ZMax((SELECT geom FROM ny WHERE bldg_bin = $1))";
		const values = [bin];
		const res = await performLosQuery(text, values);
		if (!res.length) throw `Could not find building data for ${bin} (3)`;
		const { st_zmax } = res[0];
		const offset = 4;
		return parseInt(st_zmax) + offset;
	}

	async function getNodesInRange(nodes, bin, range) {
		const nodeBins = nodes
			.map(node => node.bin)
			.filter(bin => bin % 1000000 !== 0);
		const nodesInRange = await performLosQuery(
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
		return nodesInRange;
	}

	async function getIntersections(midpoint1, height1, midpoint2, height2) {
		const [x1, y1] = midpoint1;
		const [x2, y2] = midpoint2;
		const text = `SELECT
				a.bldg_bin as bin
			FROM
				ny AS a
			WHERE
				ST_3DIntersects (a.geom, ST_SetSRID ('LINESTRINGZ (${x1} ${y1} ${height1}, ${x2} ${y2} ${height2})'::geometry, 2263))
			LIMIT 3`;
		const res = await performLosQuery(text);
		if (!res) throw "Failed to get intersections";
		return res;
	}
}
