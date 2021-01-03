/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns("requests", {
    slack_ts: { type: "varchar(256)" },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns("requests", ["slack_ts"]);
};
