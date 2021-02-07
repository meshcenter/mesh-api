import { performQuery } from ".";

const authorizedGetMapQuery = `SELECT 
  json_build_object(
    'nodes',
    COALESCE( 
      (
        SELECT
          json_agg(
            json_build_object(
              'id', nodes.id,
              'lat', nodes.lat, 
              'lng',  nodes.lng, 
              'status', nodes.status, 
              'name', nodes.name,
              'notes', nodes.notes,
              'devices', (
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
                  LEFT JOIN device_types ON device_types.id = devices.device_type_id
                WHERE devices.node_id = nodes.id
              )
            )
        )
        FROM 
          nodes
      ),
      '[]'
    ),
    'requests',
    COALESCE(
      (
        SELECT
          json_agg(
            DISTINCT jsonb_build_object(
              'id', requests.id,
              'lat', buildings.lat,
              'lng', buildings.lng,
              'bin', buildings.bin,
              'status', requests.status,
              'roof_access', requests.roof_access,
              'has_panoramas', panoramas IS NOT NULL
            )
          )
        FROM
          requests
          JOIN buildings ON buildings.id = requests.building_id
          LEFT JOIN panoramas ON requests.id = panoramas.request_id
      ),
      '[]'
    ),
    'links', 
    COALESCE(
      (
        SELECT 
          json_agg(
            json_build_object(
              'id', links.id,
              'status', links.status,
              'devices', (
                  SELECT
                    json_agg(
                      json_build_object(
                        'id', devices.id,
                        'type', device_types,
                        'lat', devices.lat,
                        'lng', devices.lng,
                        'node_id', devices.node_id
                      )
                    )
                  FROM
                    devices
                    LEFT JOIN device_types ON device_types.id = devices.device_type_id
                  WHERE devices.id IN(links.device_a_id, links.device_b_id)
                )
            )
          )
        FROM 
          links
      ),
      '[]'
    ),
    'appointments',
    COALESCE(
      (
        SELECT
          json_agg(
            json_build_object(
              'id', appointments.id,
              'type', appointments.type,
              'lat', buildings.lat,
              'lng', buildings.lng
            )
          )
          FROM appointments
          JOIN buildings ON buildings.id = appointments.building_id
          WHERE
            appointments.date > now() - INTERVAL '6 HOURS'
      ),
      '[]'
    )
  ) as map`;

const getMapQuery = `SELECT 
  json_build_object(
    'nodes',
    COALESCE( 
      (
        SELECT
          json_agg(
            json_build_object(
              'id', nodes.id,
              'lat', nodes.lat, 
              'lng',  nodes.lng, 
              'status', nodes.status, 
              'name', nodes.name,
              'notes', nodes.notes,
              'devices', (
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
                  LEFT JOIN device_types ON device_types.id = devices.device_type_id
                WHERE devices.node_id = nodes.id
              )
            )
        )
        FROM 
          nodes
      ),
      '[]'
    ),
    'requests',
    COALESCE(
      (
        SELECT
          json_agg(
            DISTINCT jsonb_build_object(
              'id', requests.id,
              'lat', buildings.lat,
              'lng', buildings.lng,
              'bin', buildings.bin,
              'status', requests.status,
              'roof_access', requests.roof_access,
              'has_panoramas', panoramas IS NOT NULL
            )
          )
        FROM
          requests
          JOIN buildings ON buildings.id = requests.building_id
          LEFT JOIN panoramas ON requests.id = panoramas.request_id
      ),
      '[]'
    ),
    'links', 
    COALESCE(
      (
        SELECT 
          json_agg(
            json_build_object(
              'id', links.id,
              'status', links.status,
              'devices', (
                  SELECT
                    json_agg(
                      json_build_object(
                        'id', devices.id,
                        'type', device_types,
                        'lat', devices.lat,
                        'lng', devices.lng,
                        'node_id', devices.node_id
                      )
                    )
                  FROM
                    devices
                    LEFT JOIN device_types ON device_types.id = devices.device_type_id
                  WHERE devices.id IN(links.device_a_id, links.device_b_id)
                )
            )
          )
        FROM 
          links
      ),
      '[]'
    )
  ) as map`;

export async function getMap(authorized) {
  let map;
  if (authorized) {
    const results = await performQuery(authorizedGetMapQuery);
    map = results[0].map;
  } else {
    const results = await performQuery(getMapQuery);
    map = results[0].map;
  }
  return map;
}
