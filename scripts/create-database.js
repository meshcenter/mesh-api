require("dotenv").config();
const { performQuery } = require("./db");

createDatabase();

// TODO: Figure out how to do this safely and idempotently, also migrations
async function createDatabase() {
	try {
		console.log("Dropping tables...");
		await performQuery(
			`DROP table IF EXISTS
				"appointments",
				"los",
				"links",
				"devices",
				"device_types",
				"panoramas",
				"requests",
				"members",
				"buildings",
				"nodes"`
		);

		await performQuery(
			`DROP type IF EXISTS
				"node_status",
				"device_status",
				"link_status",
				"request_status",
				"appointment_type"`
		);

		await performQuery(
			`CREATE TABLE "buildings" (
				id			SERIAL PRIMARY KEY,
				address		VARCHAR(256) NOT NULL,
				lat			FLOAT NOT NULL,
				lng			FLOAT NOT NULL,
				alt			FLOAT NOT NULL,
				bin			INT,
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
			`CREATE TYPE node_status AS ENUM ('planned', 'active', 'dead');`
		);

		await performQuery(
			`CREATE TABLE "nodes" (
				id				SERIAL PRIMARY KEY,
				lat				FLOAT NOT NULL,
				lng				FLOAT NOT NULL,
				alt				FLOAT NOT NULL,
				status			node_status NOT NULL DEFAULT 'planned',
				location		VARCHAR(256),
				name			VARCHAR(256),
				notes			TEXT,
				create_date		TIMESTAMP WITH TIME ZONE NOT NULL,
				abandon_date	TIMESTAMP WITH TIME ZONE,
				building_id		INTEGER REFERENCES buildings(id) NOT NULL,
				member_id		INTEGER REFERENCES members(id) NOT NULL
			)`
		);

		await performQuery(
			`CREATE TYPE request_status AS ENUM ('open', 'closed');`
		);

		await performQuery(
			`CREATE TABLE "requests" (
				id				SERIAL PRIMARY KEY,
				status			request_status NOT NULL DEFAULT 'open',
				roof_access		bool NOT NULL,
				date			TIMESTAMP WITH TIME ZONE NOT NULL,
				osticket_id		INTEGER,
				member_id		INTEGER REFERENCES members(id) NOT NULL,
				building_id		INTEGER REFERENCES buildings(id) NOT NULL
			)`
		);

		await performQuery(
			`CREATE TABLE "panoramas" (
				id				SERIAL PRIMARY KEY,
				url				VARCHAR(256) NOT NULL,
				date			TIMESTAMP WITH TIME ZONE NOT NULL,
				request_id		INTEGER REFERENCES requests(id) NOT NULL
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
				device_type_id	INTEGER REFERENCES device_types(id) NOT NULL,
				node_id			INTEGER REFERENCES nodes(id) NOT NULL
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
				device_a_id		INTEGER REFERENCES devices(id) NOT NULL,
				device_b_id		INTEGER REFERENCES devices(id) NOT NULL
			)`
		);

		await performQuery(
			`CREATE TABLE "los" (
				id				SERIAL PRIMARY KEY,
				building_a_id	INTEGER REFERENCES buildings(id) NOT NULL,
				building_b_id	INTEGER REFERENCES buildings(id) NOT NULL,
				lat_a			FLOAT NOT NULL,
				lng_a			FLOAT NOT NULL,
				alt_a			FLOAT NOT NULL,
				lat_b			FLOAT NOT NULL,
				lng_b			FLOAT NOT NULL,
				alt_b			FLOAT NOT NULL
			)`
		);

		await performQuery(
			`CREATE TYPE appointment_type AS ENUM ('install', 'support', 'survey');`
		);

		await performQuery(
			`CREATE TABLE "appointments" (
				id				SERIAL PRIMARY KEY,
				type			appointment_type NOT NULL,
				date			TIMESTAMP WITH TIME ZONE NOT NULL,
				notes			TEXT,
				acuity_id		INTEGER NOT NULL,
				member_id		INTEGER REFERENCES members(id) NOT NULL,
				building_id		INTEGER REFERENCES buildings(id)
			)`
		);
	} catch (error) {
		console.log("Error creating db:", error);
	}
}
