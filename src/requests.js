import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import pathToRegexp from "path-to-regexp";
import { performQuery } from "./db";
import { createResponse } from "./utils";

export async function handler(event, context) {
	// This is a private endpoint. Auth is required for all requests
	if (!event.headers.authorization)
		return createResponse(401, {
			error: {
				message: "Unauthorized"
			}
		});

	// Get token
	let token;
	const parts = event.headers.authorization.split(" ");
	if (parts.length == 2) {
		const scheme = parts[0];
		const credentials = parts[1];

		if (/^Bearer$/i.test(scheme)) {
			token = credentials;
		} else {
			return createResponse(401, {
				error: {
					message: "Format is Authorization: Bearer [token]"
				}
			});
		}
	} else {
		return createResponse(401, {
			error: {
				message: "Format is Authorization: Bearer [token]"
			}
		});
	}

	if (!token)
		return createResponse(401, {
			error: {
				message: "No authorization token was found."
			}
		});

	// Verify token
	try {
		await verifyToken(token);
	} catch (error) {
		console.log(error);
		return createResponse(401, {
			error: {
				message: "Invalid token."
			}
		});
	}

	// Handle request
	try {
		if (event.httpMethod === "GET") {
			if (event.path === "/requests") {
				const requests = await getRequests();
				return createResponse(200, requests);
			}

			if (event.path === "/requests/") {
				return createResponse(404, {
					error: {
						message: `Unrecognized request URL (${event.httpMethod} ${event.path}). If you are trying to list objects, remove the trailing slash. If you are trying to retrieve an object, pass a valid identifier.`
					}
				});
			}

			// TODO: Do this better
			const regex = pathToRegexp("/requests/:id", null, { strict: true });
			const result = regex.exec(event.path);

			if (!result) {
				return createResponse(404, {
					error: {
						message: `Unrecognized request URL (${event.httpMethod} ${event.path}).`
					}
				});
			}

			const id = result[1];
			const request = await getRequest(id);
			if (!request) {
				return createResponse(404, {
					error: {
						message: `No such request: ${id}`
					}
				});
			}

			return createResponse(200, request);
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

async function getRequest(id) {
	if (!Number.isInteger(parseInt(id, 10))) return null;
	const result = await performQuery(
		"SELECT * FROM join_requests WHERE id = $1",
		[id]
	);
	return result[0];
}

async function getRequests() {
	return performQuery(
		`SELECT join_requests.*, buildings.address as address, members.email as member
		FROM join_requests
		LEFT JOIN buildings ON join_requests.building_id = buildings.id
		LEFT JOIN members ON join_requests.member_id = members.id
		GROUP BY join_requests.id, buildings.id, members.id
		ORDER BY date DESC`
	);
}
