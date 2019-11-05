const path = require("path");
const Dotenv = require("dotenv-webpack");

module.exports = {
	plugins: [new Dotenv()],
	resolve: {
		alias: {
			"pg-native": path.join(__dirname, "src/aliases/pg-native.js"),
			pgpass$: path.join(__dirname, "src/aliases/pgpass.js")
		}
	}
};
