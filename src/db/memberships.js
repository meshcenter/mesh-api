import { performQuery } from ".";

export async function createMembership(nodeId, params) {
  const results = await performQuery(
    `INSERT INTO memberships (node_id, member_id) VALUES($1, $2) RETURNING *`,
    [nodeId, params.member_id]
  );

  return results[0];
}

export async function destroyMembership(id) {
  const results = await performQuery(
    `DELETE FROM memberships WHERE id = $1 RETURNING *`,
    [id]
  );

  return results[0];
}

export async function findMembership(nodeId, memberId) {
  const results = await performQuery(
    `SELECT * FROM memberships WHERE node_id = $1 AND member_id = $2`,
    [nodeId, memberId]
  );

  return results[0];
}
