import { performQuery } from "../db";

function requestPlacemark(request) {
	const { id, building, panoramas } = request;
	const dashboardLink = `<a href="https://dashboard.nycmesh.net/requests/${id}" style="margin-right: 1rem;">Dashboard →</a>`;
	const ticketLink = `<a href="https://support.nycmesh.net/scp/tickets.php?a=search&amp;query=${id}" style="margin-right: 1rem;">Tickets →</a>`;
	return `
<Placemark>
	<name>${id}</name>
	<ExtendedData>
		<Data name="ID">
			<value>${id}</value>
		</Data>
        <Data name="Date">
            <value>${request.date.toDateString()}</value>
        </Data>
        <Data name="Links">
            <value>	
            	${dashboardLink}
				${ticketLink}
			</value>
        </Data>
		${(panoramas || []).map(panoData)}
	</ExtendedData>
	<Point>
		<altitudeMode>absolute</altitudeMode>
		<coordinates>${building.lng},${building.lat},${building.alt}</coordinates>
	</Point>
	<styleUrl>${panoramas ? "#panoRequest" : "#request"}</styleUrl>
</Placemark>`;
}

function panoData(panorama) {
	return `
<Data name="Pano">
	<value>
	<img src="${panorama.url}" style="max-width: 32rem;"></img>
	</value>
 </Data>`;
}

function iconStyle(id, scale, icon) {
	return `<Style id="${id}">
    <IconStyle>
        <scale>${scale}</scale> 
    	<Icon>
    		<href>${icon}</href>
    	</Icon>
        <hotSpot xunits="fraction" yunits="fraction" x="0.5" y="0.5"></hotSpot>
    </IconStyle>
    <LabelStyle>
    	<scale>0</scale>
	</LabelStyle>
</Style>`;
}

export async function getRequestsKML(params) {
	const { pano } = params;
	const requests = await getRequests();

	const requestsKml = requests.map(requestPlacemark);

	const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
	<Document>
		${iconStyle("request", 0.5, "https://i.imgur.com/oVFMyJU.png")}
		${iconStyle("panoRequest", 0.5, "https://i.imgur.com/uj6HMxZ.png")}
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
