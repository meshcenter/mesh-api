const path = require("path");

module.exports = {
	resolve: {
		alias: {
			"pg-native": path.join(__dirname, "src/aliases/pg-native.js"),
			pgpass$: path.join(__dirname, "src/aliases/pgpass.js")
		}
	}
};
