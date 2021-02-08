/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addTypeValue("request_status", "installed", { ifNotExists: true });
};

exports.down = (pgm) => {
  // Enum types can't be removed
};
