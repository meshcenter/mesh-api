/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.alterColumn("requests", "apartment", { type: "varchar(256)" });
};

exports.down = (pgm) => {
  pgm.alterColumn("requests", "apartment", { type: "varchar(10)" });
};
