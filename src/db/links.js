import { performQuery } from ".";

export async function getLinks() {
  return performQuery(`SELECT
	links.*,
	json_agg(nodes) as nodes,
	json_agg(json_build_object('id', devices.id, 'type', device_types, 'lat', devices.lat, 'lng', devices.lng, 'alt', devices.alt, 'azimuth', devices.azimuth, 'status', devices.status, 'name', devices.name, 'ssid', devices.ssid, 'notes', devices.notes, 'create_date', devices.create_date, 'abandon_date', devices.abandon_date)) AS devices
FROM
	links
	JOIN devices ON devices.id IN(links.device_a_id, links.device_b_id)
	JOIN device_types ON device_types.id = devices.device_type_id
	JOIN nodes ON nodes.id = devices.node_id
	GROUP BY
		links.id`);
}

export async function getLink(id) {
  const link = await performQuery(
    `SELECT
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
    [id]
  );
  if (!link) throw new Error("Not found");
  return link;
}

export async function createLink({ device_a_id, device_b_id }) {
  const [
    newLink,
  ] = await performQuery(
    `INSERT INTO links (device_a_id, device_b_id, status, create_date) VALUES($1, $2, $3, $4) RETURNING *`,
    [device_a_id, device_b_id, "active", new Date()]
  );
  return getLink(newLink.id);
}

export async function deleteLink({ id }) {
  await getLink(id);
  return performQuery(`DELETE FROM links WHERE id = $1 RETURNING *`, [id]);
}
