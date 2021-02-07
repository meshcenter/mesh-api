import { performQuery } from "../db";
import { iconStyle, lineStyle, data, panoData, kml } from "./utils";

export async function getNodesKML() {
  const nodes = await getNodes();
  const links = await getLinks();

  const linksByNode = links.reduce((acc, cur) => {
    acc[cur.node_a.id] = acc[cur.node_a.id] || [];
    acc[cur.node_a.id].push(cur);
    return acc;
  }, {});

  const nodesKml = nodes
    .sort((a, b) => a.id - b.id)
    .map(
      (node) => `<Folder>
  <name>${node.id}</name>
  ${nodePlacemark(node)}
  ${(linksByNode[node.id] || []).map(linkPlacemark)}
</Folder>`
    );

  const elements = [
    iconStyle("supernode", 0.6, "https://i.imgur.com/GFd364p.png"),
    iconStyle("hub", 0.6, "https://i.imgur.com/dsizT9e.png"),
    iconStyle("omni", 0.6, "https://i.imgur.com/dsizT9e.png"),
    iconStyle("node", 0.5, "https://i.imgur.com/OBBZi9E.png"),
    lineStyle("hubLink", "ff00ffff", 3),
    lineStyle("backboneLink", "ff00ffff", 3),
    lineStyle("activeLink", "ff0000ff", 3),
    nodesKml,
  ];

  return kml(elements);
}

function nodePlacemark(node) {
  const dashboardLink = `<a href="https://dashboard.nycmesh.net/map/nodes/${node.id}" style="margin-right: 1rem;">Dashboard →</a>`;
  const ticketLink = `<a href="https://support.nycmesh.net/scp/tickets.php?a=search&amp;query=${node.id}" style="margin-right: 1rem;">Tickets →</a>`;
  return `<Placemark>
  <name>${node.name || `Node ${node.id}`}</name>
    <ExtendedData>
    ${node.name ? data("Name", node.name) : ""}
    ${data("Status", node.status)}
    ${data("Installed", node.create_date.toDateString())}
    ${data("Devices", node.device_types.map((d) => d.name).join(", "))}
    ${node.notes ? data("Notes", node.notes) : ""}
    ${data("Links", `${dashboardLink} ${ticketLink}`)}
    ${panoData(node.panoramas.filter((p) => p) || [])}
  </ExtendedData>
  <Point>
    <altitudeMode>absolute</altitudeMode>
    <coordinates>${node.lng},${node.lat},${node.alt || 20}</coordinates>
  </Point>
  <styleUrl>${nodeStyleId(node)}</styleUrl>
</Placemark>`;
}

function linkPlacemark(link) {
  const { node_a, node_b, device_type_a, device_type_b } = link;
  const coordinates = `${node_a.lng},${node_a.lat},${node_a.alt} ${node_b.lng},${node_b.lat},${node_b.alt}`;
  const deviceNameA =
    device_type_a.name === "Unknown" ? "Unknown Device" : device_type_a.name;
  const deviceNameB =
    device_type_b.name === "Unknown" ? "Unknown Device" : device_type_b.name;
  return `<Placemark>
  <name>Link</name>
  <ExtendedData>
    ${data("ID", link.id)}
    ${data("Status", link.status)}
    ${data("From", `${node_a.name || node_a.id} ${deviceNameA}`)}
    ${data("To", `${node_b.name || node_b.id} ${deviceNameB}`)}
  </ExtendedData>
  <LineString>
    <altitudeMode>absolute</altitudeMode>
    <coordinates>${coordinates}</coordinates>
  </LineString>
  <styleUrl>${linkStyleId(link)}</styleUrl>
</Placemark>
`;
}

const isOmni = (device_type) => device_type.name === "Omni";
const isSupernode = (node) => node.name && node.name.includes("Supernode");
const isHub = (node) => node.notes && node.notes.includes("hub");
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
  const { node_a, node_b, device_type_a, device_type_b } = link;
  if (isHub(node_a) && isHub(node_b)) return "#hubLink";
  if (isBackbone(node_a, device_type_a) && isBackbone(node_b, device_type_b))
    return "#backboneLink";
  return "#activeLink";
}

const getNodesQuery = `SELECT
  nodes.id,
  nodes.name,
  nodes.status,
  nodes.notes,
  nodes.create_date,
  buildings.lat,
  buildings.lng,
  buildings.alt,
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

async function getNodes() {
  return performQuery(getNodesQuery);
}

const getLinksQuery = `SELECT
  links.*,
  (
    SELECT
      to_json(devices.*)
    FROM
      devices
    WHERE
      devices.id = device_a_id) AS device_a,
  (
    SELECT
      to_json(devices.*)
    FROM
      devices
    WHERE
      devices.id = device_b_id) AS device_b,
  (
    SELECT
      to_json(device_types.*)
    FROM
      devices
      JOIN device_types ON device_types.id = devices.device_type_id
    WHERE
      devices.id = device_a_id) AS device_type_a,
  (
    SELECT
      to_json(device_types.*)
    FROM
      devices
      JOIN device_types ON device_types.id = devices.device_type_id
    WHERE
      devices.id = device_b_id) AS device_type_b,
  (
    SELECT
      to_json(nodes.*)
    FROM
      devices
      JOIN nodes ON nodes.id = devices.node_id
    WHERE
      devices.id = device_a_id) AS node_a,
  (
    SELECT
      to_json(nodes.*)
    FROM
      devices
      JOIN nodes ON nodes.id = devices.node_id
    WHERE
      devices.id = device_b_id) AS node_b
FROM
  links
  JOIN devices ON devices.id IN (links.device_a_id, links.device_b_id)
  JOIN device_types ON device_types.id = devices.device_type_id
  JOIN nodes ON nodes.id = devices.node_id
WHERE
  links.status = 'active'
GROUP BY
  links.id`;

async function getLinks() {
  return performQuery(getLinksQuery);
}
