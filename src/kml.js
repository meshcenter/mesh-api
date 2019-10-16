import { performQuery } from "./db";
import { createResponse } from "./utils";

export async function handler(event) {
	if (event.httpMethod === "OPTIONS") {
		return createResponse(200);
	}

	try {
		if (event.httpMethod === "GET") {
			if (event.path !== "/kml") {
				return createResponse(404, "Bad path");
			}

			const nodes = await getNodes();
			const links = await getLinks();

			const nodesKml = nodes.map(
				node => `
		<Placemark>
		    <name>${node.name || node.id}</name>
		    <ExtendedData>
		        <Data name="id">
		            <value>${node.id}</value>
		        </Data>
		        <Data name="name">
		            <value>${node.name}</value>
		        </Data>
		        <Data name="status">
		            <value>${node.status}</value>
		        </Data>
		    </ExtendedData>
		    <Point>
		        <altitudeMode>absolute</altitudeMode>
		        <coordinates>${node.lng},${node.lat},${node.alt}</coordinates>
		    </Point>
		    <styleUrl>${getStyle(node)}</styleUrl>
		</Placemark>`
			);

			const linksKml = links.map(link => {
				const [node_a, node_b] = link.nodes;
				const [device_type_a, device_type_b] = link.device_types;
				return `
		<Placemark>
            <name>${node_a.id} - ${node_b.id}</name>
            <ExtendedData>
                <Data name="status">
                    <value>${link.status}</value>
                </Data>
                <Data name="from">
                    <value>${node_a.id}</value>
                </Data>
                <Data name="to">
                    <value>${node_b.id}</value>
                </Data>
            </ExtendedData>
            <LineString>
                <altitudeMode>absolute</altitudeMode>
                <coordinates>${node_a.lng},${node_a.lat},${node_a.alt} ${
					node_b.lng
				},${node_b.lat},${node_b.alt}</coordinates>
            </LineString>
            <styleUrl>${getLinkStyle(
				node_a,
				node_b,
				device_type_a,
				device_type_b
			)}</styleUrl>
        </Placemark>
			`;
			});

			const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
	<Document>
		<Style id="hubLink">
        	<LineStyle>
        		<color>FF00FFFF</color>
        		<width>3</width>
    		</LineStyle>
    		<PolyStyle>
    			<color>00000000</color>
			</PolyStyle>
        </Style>
        <Style id="backboneLink">
        	<LineStyle>
        		<color>FF00FFFF</color>
        		<width>2</width>
    		</LineStyle>
    		<PolyStyle>
    			<color>00000000</color>
			</PolyStyle>
        </Style>
        <Style id="activeLink">
        	<LineStyle>
        		<color>aa0000ff</color>
        		<width>2</width>
    		</LineStyle>
    		<PolyStyle>
    			<color>00000000</color>
			</PolyStyle>
        </Style>
		<Style id="supernode">
	        <IconStyle>
		        <scale>0.6</scale> 
	        	<Icon>
	        		<href>https://i.imgur.com/flgK1j1.png</href>
	        	</Icon>
		        <hotSpot xunits="fraction" yunits="fraction" x="0.5" y="0.5"></hotSpot>
	        </IconStyle>
        </Style>
		<Style id="hub">
	        <IconStyle>
	        	<scale>0.6</scale> 
	        	<Icon>
	        		<href>https://i.imgur.com/xbfOy3Q.png</href>
	        	</Icon>
		        <hotSpot xunits="fraction" yunits="fraction" x="0.5" y="0.5"></hotSpot>
	        </IconStyle>
        </Style>
        <Style id="omni">
	        <IconStyle>
	        	<scale>0.4</scale> 
	        	<Icon>
	        		<href>https://i.imgur.com/7dMidbX.png</href>
	        	</Icon>
		        <hotSpot xunits="fraction" yunits="fraction" x="0.5" y="0.5"></hotSpot>
	        </IconStyle>
        </Style>
		<Style id="node">
	        <IconStyle>
	        	<scale>0.4</scale> 
	        	<Icon>
	        		<href>https://i.imgur.com/7SIgB7Z.png</href>
	        	</Icon>
		        <hotSpot xunits="fraction" yunits="fraction" x="0.5" y="0.5"></hotSpot>
	        </IconStyle>
        </Style>
		${linksKml}
        ${nodesKml}
	</Document>
</kml>`;

			function getStyle(node) {
				const { name, notes, devices } = node;

				if (name && name.includes("Supernode")) return "#supernode";

				if (notes && notes.includes("hub")) return "#hub";

				if (
					devices.filter(device => device.type.name === "Omni").length
				)
					return "#omni";

				return "#node";
			}

			function getLinkStyle(node1, node2, device_type1, device_type2) {
				const isSupernode = node =>
					node.name && node.name.includes("Supernode");
				const isHub = node => node.notes && node.notes.includes("hub");
				const isOmni = device_type => device_type.name === "Omni";
				const isBackbone = (node, device_type) =>
					isSupernode(node) || isHub(node) || isOmni(device_type);

				if (isHub(node1) && isHub(node2)) return "#hubLink";

				if (
					isBackbone(node1, device_type1) &&
					isBackbone(node2, device_type2)
				) {
					return "#backboneLink";
				}
				return "#activeLink";
			}

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

function isValidNode(node) {
	const { lat, lng, alt, create_date } = node;
	if (!lat || !lng || !alt || !create_date) return false;
	return true;
}

async function getNodes() {
	return performQuery(
		`SELECT
			nodes.*,
			buildings.address AS building,
			json_agg(json_build_object('id', devices.id, 'type', device_types, 'lat', devices.lat, 'lng', devices.lng, 'alt', devices.alt, 'azimuth', devices.azimuth, 'status', devices.status, 'name', devices.name, 'ssid', devices.ssid, 'notes', devices.notes, 'create_date', devices.create_date, 'abandon_date', devices.abandon_date)) AS devices
		FROM
			nodes
			LEFT JOIN buildings ON nodes.building_id = buildings.id
			LEFT JOIN devices ON nodes.id = devices.node_id
			LEFT JOIN device_types ON device_types.id IN (devices.device_type_id)
		GROUP BY
			nodes.id,
			buildings.id
		ORDER BY
			nodes.create_date DESC`
	);
}

async function getLinks() {
	return performQuery(
		`SELECT
			links.*,
			json_agg(devices) as devices,
			json_agg(device_types) as device_types,
			json_agg(nodes) as nodes
		FROM
			links
			JOIN devices ON devices.id = links.device_a_id
				OR devices.id = links.device_b_id
			JOIN device_types ON device_types.id = devices.device_type_id
			JOIN nodes ON nodes.id = devices.node_id
			GROUP BY
				links.id`
	);
}
