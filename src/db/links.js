import { performQuery } from ".";

const getLinksQuery = `SELECT
	links.*,
	json_agg(devices) as devices,
	json_agg(device_types) as device_types,
	json_agg(nodes) as nodes
FROM
	links
	JOIN devices ON devices.id = links.device_a_id
		OR devices.id = links.device_b_id
	JOIN device_types ON device_types.id = devices.device_type_id
	JOIN nodes ON nodes.id = devices.node_id
	GROUP BY
		links.id`;

export async function getLinks(id) {
	return performQuery(getLinksQuery);
}
