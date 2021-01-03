import { performQuery } from ".";

const getMapQuery = `SELECT 
  json_build_object(
    'nodes', 
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
    'requests', 
    (
      SELECT 
        json_agg(
          json_build_object(
            'id', requests.id, 
            'lat', buildings.lat, 
            'lng', buildings.lng, 
            'status', requests.status
          )
        ) 
      FROM 
        requests 
        JOIN buildings ON buildings.id = requests.building_id
    ), 
    'links', 
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
    )
  ) as map`;

export async function getMap() {
  const [map] = await performQuery(getMapQuery);
  return map.map;
}
