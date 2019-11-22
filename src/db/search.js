import { performQuery } from ".";

export async function getSearch(s) {
	const nodes = await searchNodes(s);
	const buildings = await searchBuildings(s);
	const requests = await searchRequests(s);
	const members = await searchMembers(s);
	return {
		nodes,
		buildings,
		members,
		requests
	};
}

function searchNodes(query) {
	return performQuery(
		`SELECT
			*
		FROM
			nodes
		WHERE
			CAST(id AS VARCHAR) = $1
				OR name ILIKE $2
				OR notes ILIKE $3
		GROUP BY
			id
		LIMIT 5`,
		[query, `${query}%`, `%${query}%`]
	);
}

function searchBuildings(query) {
	return performQuery(
		`SELECT
			*
		FROM
			buildings
		WHERE address ILIKE $1
				OR notes ILIKE $2
			GROUP BY
				id
		LIMIT 5`,
		[`${query}%`, `%${query}%`]
	);
}

function searchRequests(query) {
	return performQuery(
		`SELECT
			requests.*,
			to_json(buildings) AS building,
			to_json(members) AS member
		FROM
			requests
		JOIN buildings ON requests.building_id = buildings.id
		JOIN members ON requests.member_id = members.id
		WHERE buildings.address ILIKE $1
			OR members.name ILIKE $1
			OR members.email ILIKE $1
			OR notes ILIKE $2
		GROUP BY
			requests.id,
			buildings.id,
			members.id
		LIMIT 5`,
		[`${query}%`, `%${query}%`]
	);
}

function searchMembers(query) {
	return performQuery(
		`SELECT *
		FROM
			members
		WHERE name ILIKE $1
			OR name ILIKE $2
			OR email ILIKE $3
		LIMIT 5`,
		[`${query}%`, ` ${query}%`, `${query}%`]
	);
}
