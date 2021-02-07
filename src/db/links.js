import { performQuery } from ".";

const getLinksQuery = `SELECT
	links.*,
	json_agg(nodes) as nodes,
	json_agg(json_build_object('id', devices.id, 'type', device_types, 'lat', devices.lat, 'lng', devices.lng, 'alt', devices.alt, 'azimuth', devices.azimuth, 'status', devices.status, 'name', devices.name, 'ssid', devices.ssid, 'notes', devices.notes, 'create_date', devices.create_date, 'abandon_date', devices.abandon_date)) AS devices
FROM
	links
	JOIN devices ON devices.id IN(links.device_a_id, links.device_b_id)
	JOIN device_types ON device_types.id = devices.device_type_id
	JOIN nodes ON nodes.id = devices.node_id
	GROUP BY
		links.id`;

export async function getLinks() {
	return performQuery(getLinksQuery);
}

const getLinkQuery = `SELECT
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
	links.id`;

async function getLink(id) {
	const link = await performQuery(getLinkQuery, [id]);
	if (!link) throw new Error("Not found");
	return link;
}

const authorizedCreateLinkQuery = `INSERT INTO links (device_a_id, device_b_id, status, create_date)
  VALUES($1, $2, $3, $4)
RETURNING
  *`;

export async function authorizedCreateLink({ device_a_id, device_b_id }) {
	const values = [device_a_id, device_b_id, "active", new Date()];
	const [newLink] = await performQuery(authorizedCreateLinkQuery, values);
	const fullNewLink = await getLink(newLink.id);
	return fullNewLink;
}
