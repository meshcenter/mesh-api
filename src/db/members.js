import { performQuery } from ".";

const getMembersQuery = `SELECT
	members.*,
	JSON_AGG(DISTINCT nodes.*) AS nodes
FROM
	members
	LEFT JOIN nodes ON nodes.member_id = members.id
GROUP BY
	members.id
ORDER BY
	members.id DESC`;

const getMemberQuery = `SELECT
	*
FROM
	members
WHERE
	members.id = $1`;

const getMemberNodesQuery = `SELECT
	nodes.*,
	to_json(buildings) AS building
FROM
	nodes
	JOIN buildings ON nodes.building_id = buildings.id
WHERE
	member_id = $1
GROUP BY
	nodes.id,
	buildings.id`;

const getMemberRequestsQuery = `SELECT
	requests.*,
	to_json(buildings) AS building
FROM
	requests
	JOIN buildings ON requests.building_id = buildings.id
WHERE
	member_id = $1
GROUP BY
	requests.id,
	buildings.id`;

export async function getMembers() {
	return performQuery(getMembersQuery);
}

export async function getMember(id) {
	if (!Number.isInteger(parseInt(id, 10))) return null;

	const members = await performQuery(getMemberQuery, [id]);
	const nodes = await performQuery(getMemberNodesQuery, [id]);
	const requests = await performQuery(getMemberRequestsQuery, [id]);

	return {
		...members[0],
		nodes,
		requests
	};
}
