/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns("members", {
    stripe_customer_id: { type: "varchar(255)" },
    donor: { type: "bool" },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns("members", ["stripe_customer_id", "donor"]);
};
