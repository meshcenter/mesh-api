const kmlWithBaseURL = baseURL => `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">
<Document>
	<name>NYC Mesh API</name>
	<NetworkLink>
		<name>Nodes</name>
		<Link>
			<href>${baseURL}/v1/kml/nodes</href>
		</Link>
	</NetworkLink>
	<NetworkLink>
		<name>Requests</name>
		<Link>
			<href>${baseURL}/v1/kml/requests</href>
		</Link>
	</NetworkLink>
	<NetworkLink>
		<name>LoS</name>
		<Link>
			<href>${baseURL}/v1/kml/los</href>
		</Link>
	</NetworkLink>
</Document>
</kml>
`;

export function getKML() {
	const baseURL =
		process.env.CONTEXT === "production"
			? "https://api.nycmesh.net"
			: "http://localhost:9000";
	return kmlWithBaseURL(baseURL);
}
