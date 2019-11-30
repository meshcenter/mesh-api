import { performQuery } from "../db";

const getNodesQuery = `SELECT
	nodes.*,
	buildings.address,
	json_agg(DISTINCT devices) as devices,
	json_agg(DISTINCT device_types) as device_types,
	json_agg(DISTINCT panoramas) as panoramas
FROM
	nodes
	LEFT JOIN buildings ON nodes.building_id = buildings.id
	LEFT JOIN devices ON nodes.id = devices.node_id
	LEFT JOIN device_types ON device_types.id IN (devices.device_type_id)
	LEFT JOIN requests ON requests.building_id = buildings.id
	LEFT JOIN panoramas ON panoramas.request_id = requests.id
WHERE
	nodes.status = 'active'
GROUP BY
	nodes.id,
	buildings.id
ORDER BY
	nodes.create_date DESC`;

const getLinksQuery = `SELECT
	links.*,
	json_agg(DISTINCT nodes) as nodes,
	json_agg(DISTINCT devices) as devices,
	json_agg(device_types) as device_types
FROM
	links
	JOIN devices ON devices.id IN (links.device_a_id, links.device_b_id)
	JOIN device_types ON device_types.id = devices.device_type_id
	JOIN nodes ON nodes.id = devices.node_id
WHERE
	links.status = 'active'
GROUP BY
	links.id`;

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
		${linkStyle("hubLink", "ff00eeff", 2.5)}
		${linkStyle("backboneLink", "ff00eeff", 2.5)}
		${linkStyle("activeLink", "66552dff", 2.5)}
		${nodeStyle("supernode", 0.75, "https://i.imgur.com/GFd364p.png")}
		${nodeStyle("hub", 0.75, "https://i.imgur.com/dsizT9e.png")}
		${nodeStyle("omni", 0.5, "https://i.imgur.com/dsizT9e.png")}
		${nodeStyle("node", 0.4, "https://i.imgur.com/OBBZi9E.png")}
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
			        <Data name="devices">
			            <value>${node.device_types.map(d => d.name).join(", ")}</value>
			        </Data>
			        <Data name="installed">
			            <value>${node.create_date.toDateString()}</value>
			        </Data>
			        ${(node.panoramas || [])
						.filter(p => p)
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
			    <styleUrl>${nodeStyleId(node)}</styleUrl>
			</Placemark>`;
}

function linkPlacemark(link) {
	const [node_a, node_b] = link.nodes;
	const coordinates = `${node_a.lng},${node_a.lat},${node_a.alt} ${node_b.lng},${node_b.lat},${node_b.alt}`;
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
        <coordinates>${coordinates}</coordinates>
    </LineString>
    <styleUrl>${linkStyleId(link)}</styleUrl>
</Placemark>
`;
}

const isOmni = device_type => device_type.name === "Omni";
const isSupernode = node => node.name && node.name.includes("Supernode");
const isHub = node => node.notes && node.notes.includes("hub");
const isBackbone = (node, device_type) =>
	isSupernode(node) || isHub(node) || isOmni(device_type);

function nodeStyleId(node) {
	const { name, notes, device_types } = node;
	if (isSupernode(node)) return "#supernode";
	if (isHub(node)) return "#hub";
	if (device_types.filter(isOmni).length) return "#omni";
	return "#node";
}

// TODO: Need to check all devices on each node to determine color.
function linkStyleId(link) {
	const { nodes, device_types } = link;
	const [node1, node2] = nodes;
	const [device_type1, device_type2] = device_types;
	if (isHub(node1) && isHub(node2)) return "#hubLink";
	if (isBackbone(node1, device_type1) && isBackbone(node2, device_type2))
		return "#backboneLink";
	return "#activeLink";
}

function linkStyle(id, color, width) {
	return `<Style id="${id}">
	<LineStyle>
		<color>${color}</color>
		<width>${width}</width>
	</LineStyle>
	<PolyStyle>
		<color>00000000</color>
	</PolyStyle>
</Style>`;
}

function nodeStyle(id, scale, icon) {
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

async function getNodes() {
	return performQuery(getNodesQuery);
}

async function getLinks() {
	return performQuery(getLinksQuery);
}
