// export async function getResource(resource) {
// 	if (!Number.isInteger(parseInt(id, 10))) return null;
// 	const buildings = await performQuery(
// 		"SELECT * FROM buildings WHERE id = $1",
// 		[id]
// 	);
// 	if (!buildings.length) return null;
// 	const building = buildings[0];
// 	const buildingNodes = await performQuery(
// 		"SELECT * FROM nodes WHERE building_id = $1",
// 		[id]
// 	);
// 	const buildingRequests = await performQuery(
// 		"SELECT * FROM join_requests WHERE building_id = $1",
// 		[id]
// 	);
// 	return {
// 		...building,
// 		nodes: buildingNodes,
// 		requests: buildingRequests
// 	};
// }

export async function getResource(resource) {
	return performQuery(
		`SELECT
			buildings.*,
			json_agg(nodes.id) FILTER (WHERE nodes.id IS NOT NULL) as nodes
		FROM buildings
		FULL JOIN nodes ON nodes.building_id = buildings.id
		FULL JOIN join_requests ON join_requests.building_id = buildings.id
		GROUP BY buildings.id
		ORDER BY buildings.id DESC`
	);
}

{
	getAllQuery: `SELECT
			buildings.*,
			json_agg(nodes.id) FILTER (WHERE nodes.id IS NOT NULL) as nodes
		FROM buildings
		FULL JOIN nodes ON nodes.building_id = buildings.id
		FULL JOIN join_requests ON join_requests.building_id = buildings.id
		GROUP BY buildings.id
		ORDER BY buildings.id DESC`;
}
