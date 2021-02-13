import { performQuery } from ".";

const queries = {
  getDevice: `SELECT
  devices.*,
  to_json(device_types) AS TYPE,
  to_json(nodes) AS node
FROM
  devices
  JOIN device_types ON device_types.id = devices.device_type_id
  JOIN nodes ON nodes.id = devices.node_id
WHERE
  devices.id = $1`,

  getDevices: `SELECT
  devices.*,
  to_json(device_types) AS TYPE,
  to_json(nodes) AS node
FROM
  devices
  JOIN device_types ON device_types.id = devices.device_type_id
  JOIN nodes ON nodes.id = devices.node_id`,

  createDevice: `INSERT INTO devices (lat, lng, alt, azimuth, status, name, ssid, notes, create_date, device_type_id, node_id)
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  RETURNING
    *`,

  updateDevice: `UPDATE
  devices
SET
  lat = $2,
  lng = $3,
  alt = $4,
  azimuth = $5,
  status = $6,
  name = $7,
  ssid = $8,
  notes = $9,
  abandon_date = $11
WHERE
  id = $1
RETURNING
  *`,

  deleteDevice: `DELETE FROM devices WHERE id = $1 RETURNING *`,

  deviceLinks: `SELECT * FROM links WHERE links.device_a_id = $1 OR links.device_b_id = $1`,
};

export async function getDevice(id) {
  const [device] = await performQuery(queries.getDevice, [id]);
  if (!device) throw new Error("Not found");
  return device;
}

export async function getDevices() {
  const devices = await performQuery(queries.getDevices);
  return devices;
}

export async function createDevice({
  lat,
  lng,
  alt,
  azimuth,
  name,
  ssid,
  notes,
  device_type_id,
  node_id,
}) {
  const status = "active";
  const create_date = new Date();
  return performQuery(queries.createDevice, [
    lat,
    lng,
    alt,
    azimuth,
    status,
    name,
    ssid,
    notes,
    create_date,
    device_type_id,
    node_id,
  ]);
}

export async function updateDevice(id, patch) {
  const device = await getDevice(id);
  const newDevice = {
    ...device,
    ...patch,
  };
  return performQuery(queries.updateDevice, [
    id,
    newDevice.lat,
    newDevice.lng,
    newDevice.alt,
    newDevice.azimuth,
    newDevice.status,
    newDevice.name,
    newDevice.ssid,
    newDevice.notes,
    newDevice.abandon_date,
  ]);
}

export async function deleteDevice(id) {
  const deviceLinks = await performQuery(queries.deviceLinks, [id]);
  if (deviceLinks.length) throw new Error("Device has active links.");
  const device = await getDevice(id);
  const [deletedDevice] = await performQuery(queries.deleteDevice, [id]);
}
