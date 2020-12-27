import { performQuery } from ".";

const getLinksQuery = `SELECT
	links.*,
	json_agg(nodes) as nodes,
	json_agg(json_build_object('id', devices.id, 'type', device_types, 'lat', devices.lat, 'lng', devices.lng, 'alt', devices.alt, 'azimuth', devices.azimuth, 'status', devices.status, 'name', devices.name, 'ssid', devices.ssid, 'notes', devices.notes, 'create_date', devices.create_date, 'abandon_date', devices.abandon_date)) AS devices
FROM
	links
	JOIN devices ON devices.id = links.device_a_id
		OR devices.id = links.device_b_id
	JOIN device_types ON device_types.id = devices.device_type_id
	JOIN nodes ON nodes.id = devices.node_id
	GROUP BY
		links.id`;

export async function getLinks() {
  return performQuery(getLinksQuery);
}
