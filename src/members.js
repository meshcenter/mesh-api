import pathToRegexp from "path-to-regexp";
import { performQuery } from "./db";
import { createResponse, checkAuth } from "./utils";

export async function handler(event) {
	if (event.httpMethod === "OPTIONS") {
		return createResponse(200);
	}

	// Verify token
	try {
		await checkAuth(event);
	} catch (error) {
		return createResponse(401, {
			error: {
				message: error.message
			}
		});
	}

	// Handle request
	try {
		if (event.httpMethod === "GET") {
			if (event.path === "/members") {
				const members = await getMembers();
				return createResponse(200, members);
			}

			if (event.path === "/members/") {
				return createResponse(404, {
					error: {
						message: `Unrecognized member URL (${event.httpMethod} ${event.path}). If you are trying to list objects, remove the trailing slash. If you are trying to retrieve an object, pass a valid identifier.`
					}
				});
			}

			// TODO: Do this better
			const regex = pathToRegexp("/members/:id", null, {
				strict: true
			});
			const result = regex.exec(event.path);

			if (!result) {
				return createResponse(404, {
					error: {
						message: `Unrecognized member URL (${event.httpMethod} ${event.path}).`
					}
				});
			}

			const id = result[1];
			const member = await getMember(id);
			if (!member) {
				return createResponse(404, {
					error: {
						message: `No such member: ${id}`
					}
				});
			}

			return createResponse(200, member);
		}
	} catch (error) {
		return createResponse(500, {
			error: {
				message: error.message
			}
		});
	}

	return createResponse(400);
}

async function verifyToken(token) {
	const client = jwksClient({
		cache: true,
		rateLimit: true,
		jwksRequestsPerMinute: 5, //10
		jwksUri: `https://dev-ockepr69.auth0.com/.well-known/jwks.json` //process.env.JWKS_URI
	});

	function getKey(header, callback) {
		client.getSigningKey(header.kid, function(err, key) {
			var signingKey = key.publicKey || key.rsaPublicKey;
			callback(null, signingKey);
		});
	}

	return new Promise((resolve, reject) => {
		jwt.verify(
			token,
			getKey,
			{
				audience: "https://api.nycmesh.net",
				issuer: `https://dev-ockepr69.auth0.com/`,
				algorithm: "RS256"
			},
			function(err, decoded) {
				if (err) return reject(err);
				resolve(decoded);
			}
		);
	});
}

async function getMember(id) {
	if (!Number.isInteger(parseInt(id, 10))) return null;

	const members = await performQuery(
		`SELECT
			*
		FROM
			members
		WHERE
			members.id = $1`,
		[id]
	);

	const nodes = await performQuery(
		`SELECT
			nodes.*,
			to_json(buildings) AS building
		FROM
			nodes
			JOIN buildings ON nodes.building_id = buildings.id
		WHERE
			member_id = $1
		GROUP BY
			nodes.id,
			buildings.id`,
		[id]
	);

	const requests = await performQuery(
		`SELECT
			requests.*,
			to_json(buildings) AS building
		FROM
			requests
			JOIN buildings ON requests.building_id = buildings.id
		WHERE
			member_id = $1
		GROUP BY
			requests.id,
			buildings.id`,
		[id]
	);

	return {
		...members[0],
		nodes,
		requests
	};
}

async function getMembers() {
	return performQuery(
		`SELECT
			members.*,
			JSON_AGG(DISTINCT nodes.*) AS nodes
		FROM
			members
			LEFT JOIN nodes ON nodes.member_id = members.id
		GROUP BY
			members.id
		ORDER BY
			members.id DESC`
	);
}
