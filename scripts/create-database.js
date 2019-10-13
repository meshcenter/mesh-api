const HerokuClient = require("heroku-client");
const { performQuery } = require("./db");

createDatabase();

// TODO: Figure out how to do this safely and idempotently, also migrations
async function createDatabase() {
	try {
		console.log("Dropping tables...");
		await performQuery(
			`DROP table IF EXISTS
				"links",
				"devices",
				"device_types",
				"panoramas",
				"requests",
				"members",
				"buildings",
				"nodes"`
		);

		// Should the statuses be one type?
		await performQuery(
			`DROP type IF EXISTS
				"node_status",
				"device_status",
				"link_status",
				"roof_access"`
		);

		await performQuery(
			`CREATE TABLE "buildings" (
				id			SERIAL PRIMARY KEY,
				address		VARCHAR(256) NOT NULL,
				lat			FLOAT NOT NULL,
				lng			FLOAT NOT NULL,
				alt			FLOAT NOT NULL,
				bin			INT,
				bin_address	VARCHAR(256),
				notes		TEXT
			)`
		);

		await performQuery(
			`CREATE TABLE "members" (
				id			SERIAL PRIMARY KEY,
				name		VARCHAR(256),
				email		VARCHAR(256) NOT NULL UNIQUE,
				phone		VARCHAR(256)
			)`
		);

		console.log("Creating tables...");

		await performQuery(
			`CREATE TYPE node_status AS ENUM ('active', 'dead');`
		);

		await performQuery(
			`CREATE TABLE "nodes" (
				id				SERIAL PRIMARY KEY,
				lat				FLOAT NOT NULL,
				lng				FLOAT NOT NULL,
				alt				FLOAT NOT NULL,
				status			node_status NOT NULL,
				location		VARCHAR(256),
				name			VARCHAR(256),
				notes			TEXT,
				create_date		TIMESTAMP WITH TIME ZONE NOT NULL,
				abandon_date	TIMESTAMP WITH TIME ZONE,
		 		building_id		INTEGER REFERENCES buildings(id),
		 		member_id		INTEGER REFERENCES members(id)
			)`
		);

		await performQuery(
			`CREATE TYPE roof_access AS ENUM ('yes', 'no', 'maybe');`
		);

		await performQuery(
			`CREATE TABLE "requests" (
		 		id				SERIAL PRIMARY KEY,
		 		date			TIMESTAMP WITH TIME ZONE NOT NULL,
		 		roof_access		roof_access NOT NULL,
		 		member_id		INTEGER REFERENCES members(id),
		 		building_id		INTEGER REFERENCES buildings(id)
		 	)`
		);

		await performQuery(
			`CREATE TABLE "panoramas" (
				id				SERIAL PRIMARY KEY,
				url				VARCHAR(256) NOT NULL,
		 		date			TIMESTAMP WITH TIME ZONE NOT NULL,
				join_request_id	INTEGER REFERENCES requests(id)
			)`
		);

		await performQuery(
			`CREATE TABLE "device_types" (
				id				SERIAL PRIMARY KEY,
		 		name			VARCHAR(256) NOT NULL,
				manufacturer	VARCHAR(256),
				range			FLOAT NOT NULL,
				width			FLOAT NOT NULL
			)`
		);

		await performQuery(
			`CREATE TYPE device_status AS ENUM ('in stock', 'active', 'dead');`
		);

		await performQuery(
			`CREATE TABLE "devices" (
				id				SERIAL PRIMARY KEY,
				lat				FLOAT NOT NULL,
				lng				FLOAT NOT NULL,
				alt				FLOAT NOT NULL,
				azimuth			INT DEFAULT 0,
				status			device_status NOT NULL,
				name			VARCHAR(256),
				ssid			VARCHAR(256),
				notes			TEXT,
		 		create_date		TIMESTAMP WITH TIME ZONE,
		 		abandon_date	TIMESTAMP WITH TIME ZONE,
				device_type_id	INTEGER REFERENCES device_types(id),
				node_id			INTEGER REFERENCES nodes(id)
			)`
		);

		await performQuery(
			`CREATE TYPE link_status AS ENUM ('planned', 'active', 'dead');`
		);

		await performQuery(
			`CREATE TABLE "links" (
				id				SERIAL PRIMARY KEY,
				status			link_status NOT NULL,
				create_date		TIMESTAMP WITH TIME ZONE NOT NULL,
				device_a_id		INTEGER REFERENCES devices(id),
				device_b_id		INTEGER REFERENCES devices(id)
			)`
		);
	} catch (error) {
		console.log("Error creating db:", error);
	}
}
