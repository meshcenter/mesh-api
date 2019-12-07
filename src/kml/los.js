import { performQuery } from "../db";

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

// Currently this hides lines of sight if nodes are in both buildings.
// This should be fixed so it shows lines of sight unless there is an
// active links between buildings.
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

const getLosOfDegreeAndPanosQuery = `SELECT
	los.*,
	json_agg(requests) as requests,
	json_agg(nodes) as nodes
FROM
	los
	JOIN buildings ON buildings.id = los.building_a_id
	JOIN requests ON requests.building_id = los.building_a_id
	JOIN nodes ON nodes.building_id = los.building_b_id
		AND nodes.status = 'active'
	JOIN panoramas ON panoramas.request_id = requests.id
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

const losOfBuildingQuery = `SELECT
	los.*
FROM
	los
	JOIN buildings ON buildings.id = los.building_a_id
	JOIN requests ON requests.building_id = buildings.id
	JOIN panoramas ON panoramas.request_id = requests.id
WHERE
	building_a_id = $1`;

export async function getLosKML(params) {
	const { pano } = params;

	const los = await getLos();

	const losByRequest = los.reduce((acc, cur) => {
		const [request] = cur.requests;
		acc[request.id] = acc[request.id] || [];
		acc[request.id].push(cur);
		return acc;
	}, {});

	const losKml = Object.entries(losByRequest).map(
		([requestId, requestLos]) => {
			const placemarks = requestLos.map(losPlacemark);
			return `<Folder><name>${requestId}</name>${placemarks}</Folder>`;
		}
	);

	const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
	<Document>
        <Style id="losLink">
        	<LineStyle>
				<color>7700ff00</color>
        		<width>2.5</width>
    		</LineStyle>
    		<PolyStyle>
    			<color>00000000</color>
			</PolyStyle>
        </Style>
		${losKml}
	</Document>
</kml>`;

	return kml;
}

function losPlacemark(los) {
	const {
		building_a_id,
		building_b_id,
		lat_a,
		lng_a,
		alt_a,
		lat_b,
		lng_b,
		alt_b,
		nodes,
		requests
	} = los;
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

async function getLos() {
	return performQuery(losQuery);
}

// At least n lines of sight
async function getLosOfDegree(degree) {
	return performQuery(losOfDegreeQuery, [degree]);
}

// At least n lines of sight, with panos
async function getLosOfDegreeAndPanos(degree) {
	return performQuery(getLosOfDegreeAndPanosQuery, [degree]);
}

async function getLosOfBuilding(id) {
	return performQuery(losOfBuildingQuery, [id]);
}
