import { performQuery } from ".";

export async function getSearch(query, authorized) {
  const results = {};

  if (authorized) {
    results.nodes = await authorizedSearchNodes(query);
    results.buildings = await authorizedSearchBuildings(query);
    results.requests = await authorizedSearchRequests(query);
    results.members = await authorizedSearchMembers(query);
  } else {
    results.nodes = await searchNodes(query);
    results.buildings = await searchBuildings(query);
  }

  return results;
}

function authorizedSearchNodes(query) {
  return performQuery(
    `SELECT
      nodes.*
    FROM
      nodes
    JOIN memberships ON memberships.node_id = nodes.id
    JOIN members ON members.id = memberships.member_id
    WHERE
      CAST(nodes.id AS VARCHAR) = $1
        OR nodes.name ILIKE $2
        OR nodes.notes ILIKE $3
        OR members.name ILIKE $2
        OR members.email ILIKE $2
    GROUP BY
      nodes.id
    LIMIT 5`,
    [query, `${query}%`, `%${query}%`]
  );
}

function searchNodes(query) {
  return performQuery(
    `SELECT
      nodes.id,
      nodes.lat,
      nodes.lng,
      nodes.alt,
      nodes.status,
      nodes.name,
      nodes.notes,
      nodes.building_id
    FROM
      nodes
    WHERE
      CAST(nodes.id AS VARCHAR) = $1
        OR nodes.name ILIKE $2
        OR nodes.notes ILIKE $3
    LIMIT 5`,
    [query, `${query}%`, `%${query}%`]
  );
}

function authorizedSearchBuildings(query) {
  return performQuery(
    `SELECT
      *
    FROM
      buildings
    WHERE address ILIKE $1
        OR notes ILIKE $2
    LIMIT 5`,
    [`${query}%`, `%${query}%`]
  );
}

function searchBuildings(query) {
  return performQuery(
    `SELECT
      id,
      lat,
      lng,
      alt,
      bin,
      notes
    FROM
      buildings
    WHERE address ILIKE $1
        OR notes ILIKE $2
    LIMIT 5`,
    [`${query}%`, `%${query}%`]
  );
}

function authorizedSearchRequests(query) {
  return performQuery(
    `SELECT
      requests.*,
      to_json(buildings) AS building,
      to_json(members) AS member
    FROM
      requests
    JOIN buildings ON requests.building_id = buildings.id
    JOIN members ON requests.member_id = members.id
    WHERE CAST(requests.id AS VARCHAR) = $1
      OR buildings.address ILIKE $3
      OR members.name ILIKE $2
      OR members.email ILIKE $2
      OR notes ILIKE $3
    GROUP BY
      requests.id,
      buildings.id,
      members.id
    LIMIT 5`,
    [query, `${query}%`, `%${query}%`]
  );
}

export async function authorizedSearchMembers(query) {
  return performQuery(
    `SELECT *
    FROM
      members
    WHERE name ILIKE $1
      OR name ILIKE $2
      OR email ILIKE $3
    LIMIT 5`,
    [`${query}%`, ` ${query}%`, `${query}%`]
  );
}

export async function authorizedSearchDeviceTypes(query) {
  return performQuery(
    `SELECT *
    FROM
      device_types
    WHERE name ILIKE $1
      OR manufacturer ILIKE $1
    LIMIT 5`,
    [`${query}%`]
  );
}
