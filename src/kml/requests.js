import { performQuery } from "../db";
import { iconStyle, data, panoData, kml } from "./utils";

export async function getRequestsKML(params) {
	const requests = await getRequests();

	const elements = [
		iconStyle("request", 0.5, "https://i.imgur.com/oVFMyJU.png"),
		iconStyle("panoRequest", 0.5, "https://i.imgur.com/uj6HMxZ.png"),
		requests.map(requestPlacemark)
	];

	return kml(elements);
}

function requestPlacemark(request) {
	const { id, building, panoramas } = request;
	const dashboardLink = `<a href="https://dashboard.nycmesh.net/requests/${id}" style="margin-right: 1rem;">Dashboard →</a>`;
	const ticketLink = `<a href="https://support.nycmesh.net/scp/tickets.php?a=search&amp;query=${id}" style="margin-right: 1rem;">Tickets →</a>`;
	return `
<Placemark>
	<name>${id}</name>
	<ExtendedData>
		${data("ID", id)}
		${data("Date", request.date.toDateString())}
		${data("Roof", request.roof_access ? "Yes" : "No")}
		${data("Links", `${dashboardLink} ${ticketLink}`)}
		${panoData(panoramas || [])}
	</ExtendedData>
	<Point>
		<altitudeMode>absolute</altitudeMode>
		<coordinates>${building.lng},${building.lat},${building.alt}</coordinates>
	</Point>
	<styleUrl>${panoramas ? "#panoRequest" : "#request"}</styleUrl>
</Placemark>`;
}

const getRequestsQuery = `SELECT
	requests.*,
	(SELECT to_json(buildings.*) FROM buildings WHERE buildings.id = requests.building_id) AS building,
	(SELECT json_agg(panoramas.*) FROM panoramas WHERE panoramas.request_id = requests.id) AS panoramas
FROM
	requests
	LEFT JOIN buildings ON requests.building_id = buildings.id
WHERE
	requests.status = 'open'
GROUP BY
	requests.id
ORDER BY
	date DESC`;

async function getRequests() {
	return performQuery(getRequestsQuery);
}
