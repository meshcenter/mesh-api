import { performQuery } from ".";

const authorizedGetDeviceQuery = `SELECT 
  devices.*,
  to_json(device_types) AS type,
  to_json(nodes) AS node
FROM devices
JOIN device_types ON device_types.id = devices.device_type_id
JOIN nodes ON nodes.id = devices.node_id
WHERE devices.id = $1`;

export async function authorizedGetDevice(id) {
  const [device] = await performQuery(authorizedGetDeviceQuery, [id]);
  if (!device) throw new Error("Not found");
  return device;
}

const authorizedCreateDeviceQuery = `INSERT INTO devices (lat, lng, alt, azimuth, status, name, ssid, notes, create_date, device_type_id, node_id)
  VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING
  *`;

export async function authorizedCreateDevice({
  lat,
  lng,
  alt,
  azimuth,
  name,
  SSID,
  notes,
  device_type_id,
  node_id,
}) {
  return performQuery(authorizedCreateDeviceQuery, [
    lat,
    lng,
    alt,
    azimuth,
    "active",
    name,
    SSID,
    notes,
    new Date(),
    device_type_id,
    node_id,
  ]);
}
