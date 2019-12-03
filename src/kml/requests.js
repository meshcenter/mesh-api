import { performQuery } from "../db";

const requestKML = request => `
<Placemark>
	<name>${request.id}</name>
	<ExtendedData>
		<Data name="id">
			<value>${request.id}</value>
		</Data>
		<Data name="tickets">
			<value>https://support.nycmesh.net/scp/tickets.php?a=search&amp;query=${
				request.id
			}</value>
		</Data>
		${(request.panoramas || []).map(
			(panorama, index) =>
				`<Data name="panorama ${index + 1}">
					<value>${panorama.url}</value>
				 </Data>`
		)}
	</ExtendedData>
	<Point>
		<altitudeMode>absolute</altitudeMode>
		<coordinates>${request.building.lng},${request.building.lat},${
	request.building.alt
}</coordinates>
	</Point>
	<styleUrl>${request.panoramas ? "#panoRequest" : "#request"}</styleUrl>
</Placemark>`;

export async function getRequestsKML(params) {
	const { pano } = params;
	const requests = pano ? await getRequestsWithPanos() : await getRequests();

	const requestsKml = requests.map(requestKML);

	const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
	<Document>
		<Style id="request">
			<IconStyle>
				<scale>0.5</scale> 
				<Icon>
					<href>https://i.imgur.com/oVFMyJU.png</href>
				</Icon>
				<hotSpot xunits="fraction" yunits="fraction" x="0.5" y="0.5"></hotSpot>
			</IconStyle>
			<LabelStyle>
				<scale>0</scale>
			</LabelStyle>
		</Style>
		<Style id="panoRequest">
			<IconStyle>
				<scale>0.5</scale> 
				<Icon>
					<href>https://i.imgur.com/uj6HMxZ.png</href>
				</Icon>
				<hotSpot xunits="fraction" yunits="fraction" x="0.5" y="0.5"></hotSpot>
			</IconStyle>
			<LabelStyle>
				<scale>0</scale>
			</LabelStyle>
		</Style>
		${requestsKml}
	</Document>
</kml>`;

	return kml;
}

async function getRequests() {
	return performQuery(
		`SELECT
	requests.*,
	(SELECT to_json(buildings.*) FROM buildings WHERE buildings.id = requests.building_id) AS building,
	(SELECT json_agg(panoramas.*) FROM panoramas WHERE panoramas.request_id = requests.id) AS panoramas
FROM
	requests
	LEFT JOIN buildings ON requests.building_id = buildings.id
WHERE
	requests.status = 'active'
GROUP BY
	requests.id
ORDER BY
	date DESC`
	);
}

async function getRequestsWithPanos() {
	return performQuery(
		`SELECT
			buildings.*,
			requests.*,
			json_agg(json_build_object('id', panoramas.id, 'url', panoramas.url, 'date', panoramas.date)) AS panoramas
		FROM
			requests
			LEFT JOIN buildings ON requests.building_id = buildings.id
			LEFT JOIN nodes ON requests.building_id = nodes.building_id
			JOIN panoramas ON panoramas.request_id = requests.id
		WHERE
			nodes.id IS NULL
		GROUP BY
			requests.id,
			buildings.id
		ORDER BY
			date DESC`
	);
}
