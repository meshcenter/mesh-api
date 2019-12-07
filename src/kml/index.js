const baseURL =
	process.env.NODE_ENV === "production"
		? "https://api.nycmesh.net"
		: "http://localhost:9000";

const networkLinkKML = (name, endpoint) => `<NetworkLink>
	<name>${name}</name>
	<Link>
		<href>${baseURL}${endpoint}</href>
	</Link>
</NetworkLink>`;

export function getKML() {
	return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">
<Document>
	<name>NYC Mesh API</name>
	${networkLinkKML("Appointments", "/v1/kml/appointments")}
	${networkLinkKML("LoS", "/v1/kml/los")}
	${networkLinkKML("Nodes", "/v1/kml/nodes")}
	${networkLinkKML("Requests", "/v1/kml/requests")}
</Document>
</kml>
`;
}
