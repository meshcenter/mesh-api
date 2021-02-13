import { performQuery } from ".";

const queries = {
	getLinks: `SELECT
	links.*,
	json_agg(nodes) as nodes,
	json_agg(json_build_object('id', devices.id, 'type', device_types, 'lat', devices.lat, 'lng', devices.lng, 'alt', devices.alt, 'azimuth', devices.azimuth, 'status', devices.status, 'name', devices.name, 'ssid', devices.ssid, 'notes', devices.notes, 'create_date', devices.create_date, 'abandon_date', devices.abandon_date)) AS devices
FROM
	links
	JOIN devices ON devices.id IN(links.device_a_id, links.device_b_id)
	JOIN device_types ON device_types.id = devices.device_type_id
	JOIN nodes ON nodes.id = devices.node_id
	GROUP BY
		links.id`,

	getLink: `SELECT
	links.*,
	json_agg(nodes) as nodes,
	json_agg(json_build_object('id', devices.id, 'type', device_types, 'lat', devices.lat, 'lng', devices.lng, 'alt', devices.alt, 'azimuth', devices.azimuth, 'status', devices.status, 'name', devices.name, 'ssid', devices.ssid, 'notes', devices.notes, 'create_date', devices.create_date, 'abandon_date', devices.abandon_date)) AS devices
FROM
	links
	JOIN devices ON devices.id IN(links.device_a_id, links.device_b_id)
	JOIN device_types ON device_types.id = devices.device_type_id
	JOIN nodes ON nodes.id = devices.node_id
WHERE
  links.id = $1
GROUP BY
	links.id`,
	createLink: `INSERT INTO links (device_a_id, device_b_id, status, create_date) VALUES($1, $2, $3, $4) RETURNING *`,
	deleteLink: `DELETE FROM links WHERE id = $1 RETURNING *`,
};

export async function getLinks() {
	return performQuery(queries.getLinks);
}

export async function getLink(id) {
	const link = await performQuery(queries.getLink, [id]);
	if (!link) throw new Error("Not found");
	return link;
}

export async function createLink({ device_a_id, device_b_id }) {
	const values = [device_a_id, device_b_id, "active", new Date()];
	const [newLink] = await performQuery(queries.createLink, values);
	const fullNewLink = await getLink(newLink.id);
	return fullNewLink;
}

export async function deleteLink({ id }) {
	const [deletedLink] = await performQuery(queries.deleteLink, [id]);
	if (!deletedLink) throw new Error("Not found");
	return deletedLink;
}
