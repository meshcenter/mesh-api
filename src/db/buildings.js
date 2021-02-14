import { performQuery } from ".";

export async function getBuildings() {
  return performQuery(`SELECT
  buildings.*,
  JSON_AGG(DISTINCT nodes.*) AS nodes
FROM
  buildings
  LEFT JOIN nodes ON nodes.building_id = buildings.id
GROUP BY
  buildings.id
ORDER BY
  COUNT(DISTINCT nodes.*) DESC`);
}

export async function getBuilding(id) {
  if (!Number.isInteger(parseInt(id, 10))) throw new Error("Bad params");
  const [building] = await performQuery(
    `SELECT
  buildings.*,
  COALESCE(
    (SELECT
      json_agg(
        json_build_object(
          'id', nodes.id,
          'lat', nodes.lat, 
          'lng',  nodes.lng, 
          'status', nodes.status, 
          'name', nodes.name,
          'notes', nodes.notes,
          'devices', COALESCE
            (
              (
                SELECT
                  json_agg(
                    json_build_object(
                      'id', devices.id,
                      'type', device_types,
                      'lat', devices.lat,
                      'lng', devices.lng,
                      'azimuth', devices.azimuth,
                      'status', devices.status
                    )
                  )
                FROM
                  devices
                JOIN device_types ON device_types.id = devices.device_type_id
                WHERE devices.node_id = nodes.id
              ),
              '[]'
            )
        )
      )
      FROM
        nodes
      WHERE
        nodes.building_id = $1
    ),
    '[]'
  ) AS nodes,
  COALESCE(
    (
      SELECT
        JSON_AGG(
          DISTINCT jsonb_build_object(
            'id', requests.id,
            'status', requests.status,
            'apartment', requests.apartment,
            'date', requests.date,
            'roof_access', requests.roof_access,
            'member', TO_JSON(members.*)
          )
        )
      FROM
        requests
      JOIN
        members ON members.id = requests.member_id
      WHERE
        requests.building_id = $1
    ),
    '[]'
  ) AS requests,
  COALESCE(json_agg(panoramas ORDER BY panoramas.date DESC) FILTER (WHERE panoramas IS NOT NULL), '[]') AS panoramas
FROM
  buildings
LEFT JOIN nodes ON nodes.building_id = buildings.id
LEFT JOIN requests ON requests.building_id = buildings.id
LEFT JOIN panoramas ON panoramas.request_id = requests.id
WHERE buildings.id = $1
GROUP BY buildings.id`,
    [id]
  );
  if (!building) throw new Error("Not found");
  return building;
}

export async function updateBuilding(id, patch) {
  const existingBuilding = await getBuilding(id, true);

  // TODO: Sanitize / validate new values!!

  const newBuilding = {
    ...existingBuilding,
    ...patch,
  };

  await performQuery(
    `UPDATE
  buildings
SET
  address = $2,
  lat = $3,
  lng = $4,
  alt = $5,
  bin = $6,
  notes = $7
WHERE
  id = $1
RETURNING
  *`,
    [
      id,
      newBuilding.address,
      newBuilding.lat,
      newBuilding.lng,
      newBuilding.alt,
      newBuilding.bin,
      newBuilding.notes,
    ]
  );
  return getBuilding(id);
}
