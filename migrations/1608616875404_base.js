/* eslint-disable camelcase */

exports.shorthands = undefined;

const notNull = true;

exports.up = (pgm) => {
  pgm.createTable("buildings", {
    id: "id",
    address: { type: "varchar(256)", notNull },
    lat: { type: "float", notNull },
    lng: { type: "float", notNull },
    alt: { type: "float", notNull },
    bin: { type: "int" },
    notes: { type: "text" },
  });

  pgm.createTable("members", {
    id: "id",
    name: { type: "varchar(256)" },
    email: { type: "varchar(256)", notNull, unique: true },
    phone: { type: "varchar(256)" },
  });

  pgm.createType("node_status", ["active", "inactive", "potential"]);

  pgm.createTable("nodes", {
    id: "id",
    lat: { type: "float", notNull },
    lng: { type: "float", notNull },
    alt: { type: "float", notNull },
    status: { type: "node_status", notNull },
    location: { type: "varchar(256)" },
    name: { type: "varchar(256)" },
    notes: { type: "text" },
    create_date: { type: "timestamp with time zone", notNull },
    abandon_date: { type: "timestamp with time zone" },
    building_id: { type: "integer", references: "buildings(id)", notNull },
    member_id: { type: "integer", references: "members(id)", notNull },
  });

  pgm.createType("request_status", ["open", "closed"]);

  pgm.createTable("requests", {
    id: "id",
    status: { type: "request_status", notNull, default: "open" },
    apartment: { type: "varchar(10)" },
    roof_access: { type: "bool", notNull },
    date: { type: "timestamp with time zone", notNull },
    osticket_id: { type: "integer" },
    building_id: { type: "integer", references: "buildings(id)", notNull },
    member_id: { type: "integer", references: "members(id)", notNull },
  });

  pgm.createTable("panoramas", {
    id: "id",
    url: { type: "varchar(256)", notNull },
    date: { type: "timestamp with time zone", notNull },
    request_id: { type: "integer", references: "requests(id)", notNull },
  });

  pgm.createTable("device_types", {
    id: "id",
    name: { type: "varchar(256)", notNull },
    manufacturer: { type: "varchar(256)" },
    range: { type: "float", notNull },
    width: { type: "float", notNull },
  });

  pgm.createType("device_status", ["active", "inactive", "potential"]);

  pgm.createTable("devices", {
    id: "id",
    lat: { type: "float", notNull },
    lng: { type: "float", notNull },
    alt: { type: "float", notNull },
    azimuth: { type: "int", default: 0 },
    status: { type: "device_status", notNull },
    name: { type: "varchar(256)" },
    ssid: { type: "varchar(256)" },
    notes: { type: "text" },
    create_date: { type: "timestamp with time zone" },
    abandon_date: { type: "timestamp with time zone" },
    device_type_id: {
      type: "integer",
      references: "device_types(id)",
      notNull,
    },
    node_id: { type: "integer", references: "nodes(id)", notNull },
  });

  pgm.createType("link_status", ["active", "inactive", "potential"]);

  pgm.createTable("links", {
    id: "id",
    status: { type: "link_status", notNull },
    create_date: { type: "timestamp with time zone", notNull },
    device_a_id: { type: "integer", references: "devices(id)", notNull },
    device_b_id: { type: "integer", references: "devices(id)", notNull },
  });

  pgm.createTable("los", {
    id: "id",
    building_a_id: { type: "integer", references: "buildings(id)", notNull },
    building_b_id: { type: "integer", references: "buildings(id)", notNull },
    lat_a: { type: "float", notNull },
    lng_a: { type: "float", notNull },
    alt_a: { type: "float", notNull },
    lat_b: { type: "float", notNull },
    lng_b: { type: "float", notNull },
    alt_b: { type: "float", notNull },
  });

  pgm.createType("appointment_type", ["install", "support", "survey"]);

  pgm.createTable("appointments", {
    id: "id",
    type: { type: "appointment_type", notNull },
    date: { type: "timestamp with time zone", notNull },
    notes: { type: "text" },
    request_id: { type: "integer", references: "requests(id)", notNull },
    member_id: { type: "integer", references: "members(id)", notNull },
    building_id: { type: "integer", references: "buildings(id)", notNull },
    node_id: { type: "integer", references: "nodes(id)" },
    acuity_id: { type: "integer" },
    slack_ts: { type: "varchar(256)" },
  });
};

exports.down = (pgm) => {
  // Tables
  const opts = { ifExists: true };
  pgm.dropTable("appointments", opts);
  pgm.dropTable("los", opts);
  pgm.dropTable("links", opts);
  pgm.dropTable("devices", opts);
  pgm.dropTable("device_types", opts);
  pgm.dropTable("panoramas", opts);
  pgm.dropTable("requests", opts);
  pgm.dropTable("members", opts);
  pgm.dropTable("buildings", opts);
  pgm.dropTable("nodes", opts);

  // Types
  pgm.dropType("node_status");
  pgm.dropType("device_status");
  pgm.dropType("link_status");
  pgm.dropType("request_status");
  pgm.dropType("appointment_type");
};
