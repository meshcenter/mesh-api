/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable("memberships", {
    id: "id",
    node_id: {type: "integer", references: "nodes(id)", notNull: true},
    member_id: {type: "integer", references: "members(id)", notNull: true},
  });

  pgm.addConstraint("memberships", "memberships_node_id_member_id_unique", {unique: ["node_id", "member_id"]});

  pgm.sql(`
    INSERT INTO memberships (node_id, member_id) SELECT id, member_id FROM nodes WHERE member_id IS NOT NULL
  `);

  pgm.dropColumns('nodes', ['member_id']);
};

exports.down = pgm => {
  pgm.addColumns('nodes', {
    member_id: {type: "integer", references: "members(id)"},
  });

  pgm.sql(`
    UPDATE nodes SET member_id = memberships.member_id FROM memberships WHERE memberships.node_id = nodes.id
  `)

  pgm.alterColumn('nodes', 'member_id', {notNull: true})

  pgm.dropTable("memberships");
};
