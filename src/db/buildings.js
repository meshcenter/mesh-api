import { performQuery } from ".";

const getBuildingsQuery = `SELECT
	buildings.*,
	JSON_AGG(DISTINCT nodes.*) AS nodes
FROM
	buildings
	LEFT JOIN nodes ON nodes.building_id = buildings.id
	LEFT JOIN requests ON requests.building_id = buildings.id
GROUP BY
	buildings.id
ORDER BY
	COUNT(DISTINCT nodes.*) DESC`;

const getBuildingQuery = "SELECT * FROM buildings WHERE id = $1";

const getBuildingNodesQuery = "SELECT * FROM nodes WHERE building_id = $1";

const getBuildingRequestsQuery =
	"SELECT id, date, roof_access FROM requests WHERE building_id = $1";

export async function getBuildings() {
	return performQuery(getBuildingsQuery);
}

export async function getBuilding(id) {
	if (!Number.isInteger(parseInt(id, 10))) throw "Bad params";
	const [building] = await performQuery(getBuildingQuery, [id]);
	if (!building) throw "Not found";
	const nodes = await performQuery(getBuildingNodesQuery, [id]);
	const requests = await performQuery(getBuildingRequestsQuery, [id]);
	return {
		...building,
		nodes,
		requests
	};
}
