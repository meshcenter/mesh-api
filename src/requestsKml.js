import { performQuery } from "./db";
import { createResponse } from "./utils";

export async function handler(event) {
	if (event.httpMethod === "OPTIONS") {
		return createResponse(200);
	}

	try {
		if (event.httpMethod === "GET") {
			if (event.path !== "/requestsKml") {
				return createResponse(404, { error: "Bad path" });
			}

			const requests = await getRequests();
			const requestsKml = requests.map(
				request => `
			 <Placemark>
			    <ExtendedData>
			        <Data name="id">
			            <value>${request.id}</value>
			        </Data>
			        <Data name="id">
			            <value>${request.address.replace(/&/g, "+")}</value>
			        </Data>
			    </ExtendedData>
			    <Point>
			        <altitudeMode>absolute</altitudeMode>
			        <coordinates>${request.lng},${request.lat},${request.alt}</coordinates>
			    </Point>
			    <styleUrl>#request</styleUrl>
			 </Placemark>`
			);

			const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
	<Document>
		<Style id="request">
	        <IconStyle>
	        	<scale>0.4</scale> 
	        	<Icon>
	        		<href>https://i.imgur.com/jmBfPPZ.png</href>
	        	</Icon>
		        <hotSpot xunits="fraction" yunits="fraction" x="0.5" y="0.5"></hotSpot>
	        </IconStyle>
        </Style>
		${requestsKml}
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

async function getRequests() {
	return performQuery(
		`SELECT
			buildings.*,
			requests.*
		FROM
			requests
			LEFT JOIN buildings ON requests.building_id = buildings.id
			JOIN panoramas ON panoramas.join_request_id = requests.id
		GROUP BY
			requests.id,
			buildings.id
		ORDER BY
			date DESC`
	);
}
