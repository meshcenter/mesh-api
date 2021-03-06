import { performQuery } from ".";

export async function getNode(id) {
  if (!Number.isInteger(parseInt(id, 10))) throw new Error("Bad params");
  const [node] = await performQuery(
    `SELECT
  nodes.id,
  nodes.lat,
  nodes.lng,
  nodes.alt,
  nodes.status,
  nodes.name,
  nodes.notes,
  json_build_object('id', buildings.id, 'lat', buildings.lat, 'lng', buildings.lng, 'alt', buildings.alt, 'bin', buildings.bin, 'notes', buildings.notes) AS building,
  COALESCE(json_agg(panoramas ORDER BY panoramas.date DESC) FILTER (WHERE panoramas IS NOT NULL), '[]') AS panoramas,
  (${nodeDevicesQuery()}) AS devices,
  (${connectedNodesQuery()}) AS connected_nodes
FROM
  nodes
  LEFT JOIN buildings ON nodes.building_id = buildings.id
  LEFT JOIN requests ON requests.building_id = buildings.id
  LEFT JOIN panoramas ON panoramas.request_id = requests.id
WHERE
  nodes.id = $1
GROUP BY
  nodes.id,
  buildings.id`,
    [id]
  );
  if (!node) throw Error("Not found");
  return node;
}

export async function authorizedGetNode(id) {
  if (!Number.isInteger(parseInt(id, 10))) throw new Error("Bad params");
  const [node] = await performQuery(
    `SELECT
  nodes.*,
  to_json(buildings) AS building,
  (${nodeMembersQuery()}) AS members,
  json_agg(DISTINCT requests) AS requests,
  COALESCE(json_agg(panoramas ORDER BY panoramas.date DESC) FILTER (WHERE panoramas IS NOT NULL), '[]') AS panoramas,
  (${nodeDevicesQuery()}) AS devices,
  (${connectedNodesQuery()}) AS connected_nodes
FROM
  nodes
  LEFT JOIN buildings ON buildings.id = nodes.building_id
  LEFT JOIN requests ON requests.building_id = buildings.id
  LEFT JOIN panoramas ON panoramas.request_id = requests.id
WHERE
  nodes.id = $1
GROUP BY
  nodes.id,
  buildings.id`,
    [id]
  );
  if (!node) throw Error("Not found");
  return node;
}

export async function getNodes() {
  return performQuery(`SELECT
  nodes.id,
  nodes.lat,
  nodes.lng,
  nodes.alt,
  nodes.status,
  nodes.name,
  nodes.notes,
  buildings.address AS building,
  (${nodeDevicesQuery()}) AS devices
FROM
  nodes
  LEFT JOIN buildings ON nodes.building_id = buildings.id
  LEFT JOIN devices ON nodes.id = devices.node_id
  LEFT JOIN device_types ON device_types.id IN (devices.device_type_id)
GROUP BY
  nodes.id,
  buildings.id
ORDER BY
  nodes.create_date DESC`);
}

export async function authorizedGetNodes() {
  return performQuery(`SELECT
  nodes.*,
  buildings.address AS building,
  (${nodeDevicesQuery()}) AS devices
FROM
  nodes
  LEFT JOIN buildings ON nodes.building_id = buildings.id
  LEFT JOIN devices ON nodes.id = devices.node_id
  LEFT JOIN device_types ON device_types.id IN (devices.device_type_id)
GROUP BY
  nodes.id,
  buildings.id
ORDER BY
  nodes.create_date DESC`);
}

export async function createNode(node) {
  const { lat, lng, alt, status, name, notes, building_id } = node;
  const randomId = await unusedNodeId();
  const now = new Date();
  return performQuery(
    `INSERT INTO nodes (id, lat, lng, alt, status, name, notes, create_date, building_id)
  VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING
  *`,
    [randomId, lat, lng, alt, status, name, notes, now, building_id]
  );

  // Super hacky way to find unused node id
  // Keep trying random numbers between 100-8000
  async function unusedNodeId(tries = 10) {
    if (tries === 0) throw new Error("Unable to find unused node id");
    const randomId = 100 + Math.floor(Math.random() * 7900);
    const [
      existingNode,
    ] = await performQuery("SELECT * FROM nodes WHERE id = $1", [randomId]);
    if (existingNode) return unusedNodeId(tries - 1);
    return randomId;
  }
}

export async function updateNode(id, patch) {
  const existingNode = await authorizedGetNode(id);

  // TODO: Sanitize / validated new values!!

  const newNode = {
    ...existingNode,
    ...patch,
  };
  await performQuery(
    `UPDATE nodes SET status = $2, lat = $3, lng = $4, alt = $5, name = $6, notes = $7, building_id = $8
WHERE id = $1
RETURNING
  *`,
    [
      id,
      newNode.status,
      newNode.lat,
      newNode.lng,
      newNode.alt,
      newNode.name,
      newNode.notes,
      newNode.building_id,
    ]
  );

  const updatedNode = await getNode(id);
  return updatedNode;
}

function nodeDevicesQuery() {
  return `SELECT
  COALESCE(json_agg(
    json_build_object(
      'id', devices.id,
      'type', device_types,
      'lat', devices.lat,
      'lng', devices.lng,
      'alt', devices.alt,
      'azimuth', devices.azimuth,
      'status', devices.status,
      'name', devices.name,
      'ssid', devices.ssid,
      'notes', devices.notes,
      'create_date', devices.create_date, 
      'abandon_date', devices.abandon_date
    )
  ), '[]') AS devices
FROM
  devices
  LEFT JOIN device_types ON device_types.id IN(devices.device_type_id)
WHERE
  devices.node_id = nodes.id`;
}

function nodeMembersQuery() {
  return `SELECT
  json_agg(json_build_object('id', members.id, 'name', members.name, 'email', members.email, 'phone', members.phone, 'donor', members.donor, 'membership_id', memberships.id))
FROM
  members
  LEFT JOIN memberships ON memberships.member_id = members.id
WHERE
  memberships.node_id = $1`;
}

function connectedNodesQuery() {
  return `COALESCE(
  (SELECT
    json_agg(json_build_object(
      'id', nodes.id,
      'lat', nodes.lat,
      'lng', nodes.lng,
      'alt', nodes.alt,
      'status', nodes.status,
      'name', nodes.name,
      'notes', nodes.notes
    ))
  FROM
    devices devices1
    JOIN links ON links.device_a_id = devices1.id
      OR links.device_b_id = devices1.id
    JOIN devices devices2 ON devices2.id = links.device_b_id
      OR devices2.id = links.device_a_id
    JOIN nodes nodes ON nodes.id = devices2.node_id
  WHERE
    devices1.node_id = $1
    AND nodes.id != $1
    AND links.status = 'active'),
  '[]'
)`;
}
