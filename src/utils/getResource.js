export async function getResource(resource) {
	return performQuery(
		`SELECT
			buildings.*,
			json_agg(nodes.id) FILTER (WHERE nodes.id IS NOT NULL) as nodes
		FROM buildings
		FULL JOIN nodes ON nodes.building_id = buildings.id
		FULL JOIN requests ON requests.building_id = buildings.id
		GROUP BY buildings.id
		ORDER BY buildings.id DESC`
	);
}
