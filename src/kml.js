const baseURL =
	process.env.NODE_ENV === "production"
		? "https://api.nycmesh.net"
		: "http://localhost:9000";

const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">
<Document>
	<name>NYC Mesh API</name>
	<NetworkLink>
		<name>Nodes</name>
		<Link>
			<href>${baseURL}/nodesKml</href>
		</Link>
	</NetworkLink>
	<NetworkLink>
		<name>Requests</name>
		<Link>
			<href>${baseURL}/requestsKml</href>
		</Link>
	</NetworkLink>
	<NetworkLink>
		<name>LoS</name>
		<Link>
			<href>${baseURL}/losKml</href>
		</Link>
	</NetworkLink>
</Document>
</kml>
`;

export async function handler(event) {
	if (event.httpMethod === "OPTIONS") {
		return { statusCode: 200 };
	}

	if (event.httpMethod === "GET") {
		return {
			statusCode: 200,
			headers: {
				"Content-Type": "application/xml",
				"Content-Disposition": `attachment; filename="nycmesh.kml"`,
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
				"Access-Control-Allow-Methods": "OPTIONS, GET"
			},
			body: kml
		};
	}
}
