import { performQuery } from "./db";
import { createResponse } from "./utils";

export async function handler(event) {
	if (event.httpMethod === "OPTIONS") {
		return createResponse(200);
	}

	try {
		if (event.httpMethod === "GET") {
			if (event.path !== "/losKml") {
				return createResponse(404, "Bad path");
			}

			const { queryStringParameters } = event;
			const { pano } = queryStringParameters;

			const los = pano
				? await getLosOfDegreeAndPanos(1)
				: await getLosOfDegree(1);

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
						        		<color>cc00ff00</color>
						        		<width>2</width>
						    		</LineStyle>
						    		<PolyStyle>
						    			<color>00000000</color>
									</PolyStyle>
						        </Style>
								${losKml}
							</Document>
						</kml>`;

			return {
				statusCode: 200,
				headers: {
					"Content-Type": "application/xml",
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Headers":
						"Content-Type, Authorization",
					"Access-Control-Allow-Methods": "OPTIONS, POST, GET"
				},
				body: kml
			};
		}
	} catch (error) {
		return createResponse(500, {
			error: {
				message: error.message
			}
		});
	}

	return createResponse(400);
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
	let toId = (los.nodes[0] || {}).id;
	return `
		<Placemark>
            <name>${fromId} - ${toId}</name>
            <ExtendedData>
                <Data name="from">
                    <value>${fromId}</value>
                </Data>
                <Data name="to">
                    <value>${toId}</value>
                </Data>
            </ExtendedData>
            <LineString>
                <altitudeMode>absolute</altitudeMode>
                <coordinates>${lng_a},${lat_a},${alt_a} ${lng_b},${lat_b},${alt_b}</coordinates>
            </LineString>
            <styleUrl>#losLink</styleUrl>
        </Placemark>
			`;
}

async function getLos() {
	return performQuery("SELECT * FROM los");
}

// Only show lines of sight for buildings with at least degree lines of sight
async function getLosOfDegree(degree) {
	return performQuery(
		`SELECT
			los.*,
			json_agg(requests) as requests,
			json_agg(nodes) as nodes
		FROM
			los
			JOIN requests ON requests.building_id = los.building_a_id
			JOIN nodes ON nodes.building_id =  los.building_b_id
		WHERE
			building_a_id IN(
				SELECT
					building_a_id FROM los
				GROUP BY
					building_a_id
				HAVING
					count(building_a_id) >= $1)
		GROUP BY
			los.id`,
		[degree]
	);
}

// Same as above, but only show requests with panos
async function getLosOfDegreeAndPanos(degree) {
	return performQuery(
		`SELECT
	los.*,
	json_agg(requests) as requests,
	json_agg(nodes) as nodes
FROM
	los
	JOIN buildings ON buildings.id = los.building_a_id
	JOIN requests ON requests.building_id = los.building_a_id
	JOIN nodes ON nodes.building_id =  los.building_b_id
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
	los.id`,
		[degree]
	);
}

async function getLosOfBuilding(id) {
	return performQuery(
		`SELECT
	 	los.*
	 FROM
	 	los
	 	JOIN buildings ON buildings.id = los.building_a_id
	 	JOIN requests ON requests.building_id = buildings.id
	 	JOIN panoramas ON panoramas.request_id = requests.id
	 WHERE
	 	building_a_id = $1`,
		[id]
	);
}
