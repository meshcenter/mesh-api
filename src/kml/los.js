import { performQuery } from "../db";
import { lineStyle, kml } from "./utils";

export async function getLosKML(params) {
	const los = await getLos();

	const losByRequest = los.reduce((acc, cur) => {
		const [request] = cur.requests;
		acc[request.id] = acc[request.id] || [];
		acc[request.id].push(cur);
		return acc;
	}, {});

	const elements = [
		lineStyle("losLink", "7700ff00", 2.5),
		Object.entries(losByRequest).map(([requestId, requestLos]) => {
			const placemarks = requestLos.map(losPlacemark);
			return `<Folder><name>${requestId}</name>${placemarks}</Folder>`;
		})
	];

	return kml(elements);
}

function losPlacemark(los) {
	const { building_a_id, building_b_id, nodes, requests } = los;
	const { lat_a, lng_a, alt_a, lat_b, lng_b, alt_b } = los;
	let fromId = (los.requests[0] || {}).id;
	let toId = (los.nodes[0] || {}).id || "Potential";
	return `
<Placemark>
    <name>Line of Sight</name>
    <LineString>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>${lng_a},${lat_a},${alt_a} ${lng_b},${lat_b},${alt_b}</coordinates>
    </LineString>
    <styleUrl>#losLink</styleUrl>
</Placemark>
	`;
}

const losQuery = `SELECT
	los.*,
	json_agg(requests) AS requests,
	json_agg(nodes) AS nodes
FROM
	los
	JOIN requests ON requests.building_id = los.building_a_id
		AND requests.status = 'active'
	LEFT JOIN nodes ON nodes.building_id = los.building_b_id
		AND nodes.status = 'active'
GROUP BY
	los.id,
	los.building_a_id`;

async function getLos() {
	return performQuery(losQuery);
}

const losOfDegreeQuery = `SELECT
	los.*,
	json_agg(requests) AS requests,
	json_agg(nodes) AS nodes
FROM
	los
	JOIN requests ON requests.building_id IN (los.building_a_id, los.building_b_id)
	LEFT JOIN nodes ON nodes.building_id = los.building_b_id
		AND nodes.status = 'active'
WHERE
	building_a_id IN(
		SELECT
			building_a_id FROM los
		GROUP BY
			building_a_id
		HAVING
			count(building_a_id) >= $1)
GROUP BY
	los.id`;

async function getLosOfDegree(degree) {
	return performQuery(losOfDegreeQuery, [degree]);
}
