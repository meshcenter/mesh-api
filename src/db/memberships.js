import { performQuery } from ".";

const createMembershipQuery = `
  INSERT INTO memberships (node_id, member_id) VALUES($1, $2) RETURNING *
`;

const destroyMembershipQuery = `
  DELETE FROM memberships WHERE id = $1
`;

export async function createMembership(nodeId, params) {
  return await performQuery(createMembershipQuery, [nodeId, params.member_id]);
}

export async function destroyMembership(id) {
  await performQuery(destroyMembershipQuery, [id]);
}
