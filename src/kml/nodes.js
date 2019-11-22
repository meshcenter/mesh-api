import { performQuery } from "../db";

const stylesKml = `<Style id="hubLink">
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
		<width>3</width>
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
    <LabelStyle>
    	<scale>0</scale>
	</LabelStyle>
</Style>
<Style id="hub">
    <IconStyle>
    	<scale>0.6</scale> 
    	<Icon>
    		<href>https://i.imgur.com/xbfOy3Q.png</href>
    	</Icon>
        <hotSpot xunits="fraction" yunits="fraction" x="0.5" y="0.5"></hotSpot>
    </IconStyle>
    <LabelStyle>
    	<scale>0</scale>
	</LabelStyle>
</Style>
<Style id="omni">
    <IconStyle>
    	<scale>0.4</scale> 
    	<Icon>
    		<href>https://i.imgur.com/7dMidbX.png</href>
    	</Icon>
        <hotSpot xunits="fraction" yunits="fraction" x="0.5" y="0.5"></hotSpot>
    </IconStyle>
    <LabelStyle>
    	<scale>0</scale>
	</LabelStyle>
</Style>
<Style id="node">
    <IconStyle>
    	<scale>0.4</scale> 
    	<Icon>
    		<href>https://i.imgur.com/7SIgB7Z.png</href>
    	</Icon>
        <hotSpot xunits="fraction" yunits="fraction" x="0.5" y="0.5"></hotSpot>
    </IconStyle>
    <LabelStyle>
    	<scale>0</scale>
	</LabelStyle>
</Style>`;

export async function getNodesKML() {
	const nodes = await getNodes();
	const links = await getLinks();

	const nodesById = nodes.map((acc, cur) => {
		acc[cur.id] = cur;
		return acc;
	}, {});

	const linksByNode = links.reduce((acc, cur) => {
		acc[cur.nodes[0].id] = acc[cur.nodes[0].id] || [];
		acc[cur.nodes[0].id].push(cur);

		acc[cur.nodes[1].id] = acc[cur.nodes[1].id] || [];
		acc[cur.nodes[1].id].push(cur);
		return acc;
	}, {});

	const nodesKml = nodes
		.sort((a, b) => a.id - b.id)
		.map(
			node => `<Folder>
					<name>${node.id}</name>
					${nodePlacemark(node)}
					${(linksByNode[node.id] || []).map(linkPlacemark)}
				</Folder>`
		);

	const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
	<Document>
		${stylesKml}
        ${nodesKml}
	</Document>
</kml>`;

	return kml;
}

function nodePlacemark(node) {
	return `<Placemark>
			    <name>${node.name || node.id}</name>
			    <ExtendedData>
			        <Data name="id">
			            <value>${node.id}</value>
			        </Data>
			        ${
						node.name
							? `<Data name="name">
			            <value>${node.name}</value>
			        </Data>`
							: ""
					}
			        <Data name="status">
			            <value>${node.status}</value>
			        </Data>
			        <Data name="address">
			            <value>${node.address.replace(/&/g, "+")}</value>
			        </Data>
			        <Data name="devices">
			            <value>${node.devices.map(d => d.type.name).join(", ")}</value>
			        </Data>
			        <Data name="installed">
			            <value>${node.create_date.toDateString()}</value>
			        </Data>
			        ${(node.panoramas || [])
						.filter(p => p.url)
						.map(
							(panorama, index) =>
								`<Data name="panorama ${index + 1}">
						            <value>${panorama.url}</value>
							     </Data>`
						)}
			    </ExtendedData>
			    <Point>
			        <altitudeMode>absolute</altitudeMode>
			        <coordinates>${node.lng},${node.lat},${node.alt}</coordinates>
			    </Point>
			    <styleUrl>${getStyle(node)}</styleUrl>
			</Placemark>`;
}

function linkPlacemark(link) {
	const [node_a, node_b] = link.nodes;
	const [device_type_a, device_type_b] = link.device_types;
	return `<Placemark>
	            <name>${node_a.id} - ${node_b.id}</name>
	            <ExtendedData>
	                <Data name="status">
	                    <value>${link.status}</value>
	                </Data>
	                <Data name="from">
	                    <value>${node_a.name || node_a.id}</value>
	                </Data>
	                <Data name="to">
	                    <value>${node_b.name || node_b.id}</value>
	                </Data>
	            </ExtendedData>
	            <LineString>
	                <altitudeMode>absolute</altitudeMode>
	                <coordinates>${node_a.lng},${node_a.lat},${node_a.alt} ${
		node_b.lng
	},${node_b.lat},${node_b.alt}</coordinates>
	            </LineString>
	            <styleUrl>${getLinkStyle(link)}</styleUrl>
	        </Placemark>
			`;
}

function getStyle(node) {
	const { name, notes, devices } = node;

	if (name && name.includes("Supernode")) return "#supernode";

	if (notes && notes.includes("hub")) return "#hub";

	if (devices.filter(device => device.type.name === "Omni").length)
		return "#omni";

	return "#node";
}

function getLinkStyle(link) {
	const { nodes, device_types } = link;
	const [node1, node2] = nodes;
	const [device_type1, device_type2] = device_types;

	const isSupernode = node => node.name && node.name.includes("Supernode");
	const isHub = node => node.notes && node.notes.includes("hub");
	const isOmni = device_type => device_type.name === "Omni";
	const isBackbone = (node, device_type) =>
		isSupernode(node) || isHub(node) || isOmni(node);

	if (isHub(node1) && isHub(node2)) return "#hubLink";
	if (isBackbone(node1, device_type1) && isBackbone(node2, device_type2))
		return "#backboneLink";
	return "#activeLink";
}

async function getNodes() {
	return performQuery(
		`SELECT
			nodes.*,
			buildings.address AS address,
			json_agg(json_build_object('id', devices.id, 'type', device_types, 'lat', devices.lat, 'lng', devices.lng, 'alt', devices.alt, 'azimuth', devices.azimuth, 'status', devices.status, 'name', devices.name, 'ssid', devices.ssid, 'notes', devices.notes, 'create_date', devices.create_date, 'abandon_date', devices.abandon_date)) AS devices,
			json_agg(json_build_object('id', panoramas.id, 'url', panoramas.url, 'date', panoramas.date)) AS panoramas
		FROM
			nodes
			LEFT JOIN buildings ON nodes.building_id = buildings.id
			LEFT JOIN devices ON nodes.id = devices.node_id
			LEFT JOIN device_types ON device_types.id IN(devices.device_type_id)
			LEFT JOIN requests ON requests.building_id = buildings.id
			LEFT JOIN panoramas ON panoramas.request_id = requests.id
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
		WHERE
			links.status = 'active'
		GROUP BY
			links.id`
	);
}
