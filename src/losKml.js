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

			const losKml = los.map(los => {
				const {
					building_a_id,
					building_b_id,
					lat_a,
					lng_a,
					alt_a,
					lat_b,
					lng_b,
					alt_b
				} = los;
				return `
		<Placemark>
            <name>${building_a_id} - ${building_b_id}</name>
            <ExtendedData>
                <Data name="from">
                    <value>${building_a_id}</value>
                </Data>
                <Data name="to">
                    <value>${building_b_id}</value>
                </Data>
            </ExtendedData>
            <LineString>
                <altitudeMode>absolute</altitudeMode>
                <coordinates>${lng_a},${lat_a},${alt_a} ${lng_b},${lat_b},${alt_b}</coordinates>
            </LineString>
            <styleUrl>#losLink</styleUrl>
        </Placemark>
			`;
			});

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

async function getLos() {
	return performQuery("SELECT * FROM los");
}

// Only show lines of sight for buildings with at least degree lines of sight
async function getLosOfDegree(degree) {
	return performQuery(
		`SELECT
	los.*,
	buildings.alt
FROM
	los
	JOIN buildings ON buildings.id = los.building_a_id
	JOIN requests ON requests.building_id = buildings.id
WHERE
	building_a_id IN(
		SELECT
			building_a_id FROM los
		GROUP BY
			building_a_id
		HAVING
			count(building_a_id) >= $1)`,
		[degree]
	);
}

// Same as above, but only show requests with panos
async function getLosOfDegreeAndPanos(degree) {
	return performQuery(
		`SELECT
	los.*,
	buildings.alt,
	panoramas.url
FROM
	los
	JOIN buildings ON buildings.id = los.building_a_id
	JOIN requests ON requests.building_id = buildings.id
	JOIN panoramas ON panoramas.request_id = requests.id
WHERE
	building_a_id IN(
		SELECT
			building_a_id FROM los
		GROUP BY
			building_a_id
		HAVING
			count(building_a_id) >= $1)`,
		[degree]
	);
}

async function getLosOfBuilding(id) {
	return performQuery(
		`SELECT
	 	los.*,
	 	panoramas.url
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
