import { performQuery } from ".";

const createMembershipQuery = `
  INSERT INTO memberships (node_id, member_id) VALUES($1, $2) RETURNING *
`;

const destroyMembershipQuery = `
  DELETE FROM memberships WHERE id = $1 RETURNING *
`;

const findMembershipQuery = `
  SELECT * FROM memberships WHERE node_id = $1 AND member_id = $2
`;

export async function createMembership(nodeId, params) {
  const results = await performQuery(createMembershipQuery, [
    nodeId,
    params.member_id,
  ]);

  return results[0];
}

export async function destroyMembership(id) {
  const results = await performQuery(destroyMembershipQuery, [id]);

  return results[0];
}

export async function findMembership(nodeId, memberId) {
  const results = await performQuery(findMembershipQuery, [nodeId, memberId]);

  return results[0];
}
