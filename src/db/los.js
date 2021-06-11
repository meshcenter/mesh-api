import { performQuery, performLosQuery } from ".";

const KM = 3280.84; // feet
const OMNI_RANGE = 0.75 * KM;
const SECTOR_RANGE = 3 * KM;
const REQUEST_RANGE = 3 * KM;

export async function getLos(bin) {
  if (!bin) throw Error("Bad params");

  // TODO: One query, and use range of device
  const omnis = await getOmnis();
  const sectors = await getSectors();
  const requests = await getRequests();

  const building = await getBuildingFromBIN(bin);
  const buildingMidpoint = await getBuildingMidpoint(bin);
  const buildingHeight = await getBuildingHeight(bin);
  const buildingHeightMeters = await getBuildingHeightMeters(bin);

  const omnisInRange = await getNodesInRange(omnis, bin, OMNI_RANGE); // 0.4 miles
  const sectorsInRange = await getNodesInRange(sectors, bin, SECTOR_RANGE); // 1.5 miles
  const requestsInRange = await getNodesInRange(requests, bin, REQUEST_RANGE);

  // TODO: Dedupe code
  const visibleOmnis1 = [];
  await addVisible(omnisInRange, visibleOmnis1);
  const visibleOmnis = visibleOmnis1.filter((node) => node.bin !== bin);

  // TODO: Dedupe code
  let visibleSectors1 = [];
  await addVisible(sectorsInRange, visibleSectors1);
  const visibleSectors = visibleSectors1.filter((node) => node.bin !== bin);

  // TODO: Dedupe code
  const visibleRequests1 = [];
  await addVisible(requestsInRange, visibleRequests1);
  const visibleRequests = visibleRequests1.filter(
    (request) => request.bin !== bin
  );

  // Only save los if building is in db... for now
  if (building) {
    const allVisible = [...visibleOmnis, ...visibleSectors, ...visibleRequests];
    const saved = {};
    for (let j = 0; j < allVisible.length; j++) {
      const visibleNode = allVisible[j];
      if (!saved[visibleNode.building_id]) {
        await saveLOS(building, visibleNode);
        saved[visibleNode.building_id] = true;
      }
    }
  }

  return {
    buildingHeight: buildingHeightMeters,
    visibleOmnis,
    visibleSectors,
    visibleRequests,
    omnisInRange,
    sectorsInRange,
  };

  async function addVisible(nodes, visible) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const { midpoint, alt } = node;
      if (parseInt(node.bin) % 1000000 === 0) continue; // Invalid bin
      const { coordinates } = await JSON.parse(midpoint);
      const [lat, lng] = coordinates;
      const nodeMidpoint = [lat, lng];
      const nodeHeight = await getBuildingHeight(node.bin);
      const intersections = await getIntersections(
        buildingMidpoint,
        buildingHeight,
        bin,
        nodeMidpoint,
        nodeHeight,
        node.bin
      );

      if (!intersections.length) {
        const distance = await getDistance(buildingMidpoint, nodeMidpoint);
        visible.push({
          ...node,
          distance,
        });
      }
    }
  }
}

async function getBuildingMidpoint(bin) {
  const text =
    "SELECT ST_AsText(ST_Centroid((SELECT geom FROM buildings WHERE bldg_bin = $1)))";
  const values = [bin];
  const res = await performLosQuery(text, values);
  if (!res.length) throw new Error("Not found");
  const { st_astext } = res[0];
  if (!st_astext) throw new Error("Not found");
  const rawText = st_astext.replace("POINT(", "").replace(")", ""); // Do this better
  const [lat, lng] = rawText.split(" ");
  return [parseFloat(lat), parseFloat(lng)];
}

export async function getBuildingHeight(bin) {
  try {
    const text =
      "SELECT ST_ZMax((SELECT geom FROM buildings WHERE bldg_bin = $1))";
    const values = [bin];
    const res = await performLosQuery(text, values);
    if (!res.length) throw new Error("Not found");
    const { st_zmax } = res[0];
    const offset = 2;
    return parseInt(st_zmax) + offset;
  } catch (error) {
    console.log(error);
    return -1;
  }
}

export async function getBuildingHeightMeters(bin) {
  const buildingHeight = await getBuildingHeight(bin);
  const buildingHeightMeters = parseInt(buildingHeight * 0.3048);
  return buildingHeightMeters;
}

async function getNodesInRange(nodes, bin, range) {
  const nodeBins = nodes
    .map((node) => node.bin)
    .filter((bin) => bin % 1000000 !== 0);
  const losNodesInRange = await performLosQuery(
    `SELECT
  bldg_bin as bin,
  ST_AsGeoJSON(ST_Centroid(geom)) as midpoint
FROM (
  SELECT
    *
  FROM
    buildings
  WHERE
    bldg_bin = ANY ($1)) AS hubs
WHERE
  ST_DWithin (ST_Centroid(geom), (
      SELECT
        ST_Centroid(geom)
      FROM
        buildings
      WHERE
        bldg_bin = $2), $3)`,
    [nodeBins, bin, range]
  );
  const losNodesInRangeMap = losNodesInRange.reduce((acc, cur) => {
    acc[cur.bin] = cur;
    return acc;
  }, {});

  const nodesInRangeBins = losNodesInRange.map((node) => node.bin);

  const nodesInRange = nodes.filter((node) =>
    nodesInRangeBins.includes(String(node.bin))
  );
  const nodesInRangeWithMidpoint = nodesInRange.map((node) => ({
    ...node,
    midpoint: losNodesInRangeMap[node.bin].midpoint,
  }));

  return nodesInRangeWithMidpoint;
}

async function getIntersections(
  midpoint1,
  height1,
  bin1,
  midpoint2,
  height2,
  bin2
) {
  const [x1, y1] = midpoint1;
  const [x2, y2] = midpoint2;
  // const distance = await getDistance(midpoint1, midpoint2);
  // const FREQUENCY = 5; // GHz
  // const MILES_FEET = 5280;
  // const fresnelRadius =
  // 72.05 * Math.sqrt(distance / MILES_FEET / (4 * FREQUENCY));
  const text = `SELECT
        a.bldg_bin as bin
      FROM
        buildings AS a
      WHERE
        ST_3DIntersects (a.geom, ST_SetSRID(ST_GeomFromText('LINESTRINGZ(${x1} ${y1} ${height1}, ${x2} ${y2} ${height2})'), 2263))
        AND bldg_bin != $1
        AND bldg_bin != $2
      LIMIT 1`;
  const res = await performLosQuery(text, [bin1, bin2]);
  if (!res) throw new Error("Failed to get intersections");
  return res;
}

// TODO: 3D
async function getDistance(point1, point2) {
  const [x1, y1] = point1;
  const [x2, y2] = point2;
  const text = `SELECT ST_Distance(
      'POINT (${x1} ${y1})'::geometry,
      'POINT (${x2} ${y2})'::geometry
    );`;
  const res = await performLosQuery(text);
  if (!res.length) throw new Error("Failed to calculate distance");
  const { st_distance } = res[0];
  const distanceFeet = st_distance;
  const distanceMeters = Math.round(distanceFeet * 0.3048);
  return distanceMeters;
}

async function getBuildingFromBIN(bin) {
  const [building] = await performQuery(
    `SELECT *
    FROM buildings
    WHERE bin = $1
    LIMIT 1`,
    [bin]
  );
  return building;
}

async function saveLOS(building, node) {
  return performQuery(
    "INSERT INTO los (building_a_id, building_b_id, lat_a, lng_a, alt_a, lat_b, lng_b, alt_b) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [
      building.id,
      node.building_id,
      building.lat,
      building.lng,
      building.alt,
      node.lat,
      node.lng,
      node.alt,
    ]
  );
}

async function getOmnis() {
  return performQuery(`SELECT
  nodes.id,
  nodes.name,
  nodes.status,
  buildings.bin,
  buildings.id as building_id,
  buildings.lat,
  buildings.lng,
  buildings.alt,
  json_agg(json_build_object('id', devices.id, 'type', device_types, 'lat', devices.lat, 'lng', devices.lng, 'alt', devices.alt, 'azimuth', devices.azimuth, 'status', devices.status, 'name', devices.name, 'ssid', devices.ssid, 'notes', devices.notes, 'create_date', devices.create_date, 'abandon_date', devices.abandon_date)) AS devices
FROM
  nodes
  LEFT JOIN buildings ON nodes.building_id = buildings.id
  LEFT JOIN devices ON devices.node_id = nodes.id
  LEFT JOIN device_types ON devices.device_type_id = device_types.id
WHERE
  device_types.name = 'Omni'
  AND devices.status = 'active'
  AND nodes.status = 'active'
GROUP BY
  nodes.id,
  buildings.bin,
  buildings.id`);
}

async function getSectors() {
  return performQuery(`SELECT
  nodes.id,
  nodes.name,
  nodes.status,
  buildings.bin,
  buildings.id as building_id,
  buildings.lat,
  buildings.lng,
  buildings.alt,
  json_agg(json_build_object('id', devices.id, 'type', device_types, 'lat', devices.lat, 'lng', devices.lng, 'alt', devices.alt, 'azimuth', devices.azimuth, 'status', devices.status, 'name', devices.name, 'ssid', devices.ssid, 'notes', devices.notes, 'create_date', devices.create_date, 'abandon_date', devices.abandon_date)) AS devices
FROM
  nodes
  LEFT JOIN buildings ON nodes.building_id = buildings.id
  LEFT JOIN devices ON devices.node_id = nodes.id
  LEFT JOIN device_types ON devices.device_type_id = device_types.id
WHERE
  device_types.name IN ('LBE-120', 'SN1Sector1', 'SN1Sector2', 'Mikrotik120', 'LTU-60', 'PS-5AC')
  AND devices.status = 'active'
  AND nodes.status = 'active'
GROUP BY
  nodes.id,
  buildings.bin,
  buildings.id`);
}

// Get hardcoded requests and requests with scheduled appointments
// added Vernon 5916 as potential
async function getRequests() {
  return performQuery(`SELECT
  requests.id,
  requests.status,
  buildings.id AS building_id,
  buildings.bin,
  buildings.address,
  buildings.lat,
  buildings.lng,
  buildings.alt
FROM
  requests
  JOIN buildings ON requests.building_id = buildings.id
  LEFT JOIN appointments ON appointments.request_id = requests.id
WHERE
  requests.id IN(5916)
  OR(
    SELECT
      id FROM appointments
    WHERE
      appointments.request_id = requests.id
      AND appointments.type = 'install'
    LIMIT 1) IS NOT NULL
GROUP BY
  requests.id,
  buildings.bin,
  buildings.id,
  appointments.id`);
}
