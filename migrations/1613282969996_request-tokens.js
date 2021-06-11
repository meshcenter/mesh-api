/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("request_tokens", {
    token: { type: "varchar(255)", notNull: true },
    request_id: { type: "integer", references: "requests(id)", notNull: true },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("request_tokens");
};
