import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

export function createResponse(statusCode, body) {
	return {
		statusCode,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
			"Access-Control-Allow-Methods": "OPTIONS, POST, GET"
		},
		body: JSON.stringify(body, null, 2)
	};
}

export async function checkAuth(event) {
	if (!event.headers.authorization) throw new Error("Unauthorized");

	// Get token
	const [scheme, token] = event.headers.authorization.split(" ");
	if (!scheme || !token)
		throw new Error("Format is Authorization: Bearer [token]");
	const validScheme = /^Bearer$/i.test(scheme);
	if (!validScheme)
		throw new Error("Format is Authorization: Bearer [token]");
	if (!token) throw new Error("No authorization token was found.");

	return verifyToken(token);

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
}
