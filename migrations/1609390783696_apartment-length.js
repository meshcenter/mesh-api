/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.alterColumn("requests", "apartment", { type: "varchar(256)" });
};

exports.down = (pgm) => {
  pgm.sql(`UPDATE requests SET apartment = substring(apartment from 1 for 10)`)
  pgm.alterColumn("requests", "apartment", { type: "varchar(10)" });
};
