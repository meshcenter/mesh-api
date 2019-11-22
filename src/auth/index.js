import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

export async function checkAuth(req) {
	if (!req.headers.authorization) throw new Error("Unauthorized");

	const [scheme, token] = req.headers.authorization.split(" ");
	if (!scheme || !token)
		throw new Error("Format is Authorization: Bearer [token]");
	const validScheme = /^Bearer$/i.test(scheme);
	if (!validScheme)
		throw new Error("Format is Authorization: Bearer [token]");
	if (!token) throw new Error("No authorization token was found.");

	return verifyToken(token);
}

async function verifyToken(token) {
	const client = jwksClient({
		cache: true,
		rateLimit: true,
		jwksRequestsPerMinute: 5,
		jwksUri: process.env.JWKS_URI
	});

	function getKey(header, callback) {
		client.getSigningKey(header.kid, (err, key) => {
			var signingKey = key.publicKey || key.rsaPublicKey;
			callback(null, signingKey);
		});
	}

	return new Promise((resolve, reject) => {
		jwt.verify(
			token,
			getKey,
			{
				audience: process.env.JWT_AUDIENCE,
				issuer: process.env.JWT_ISSUER,
				algorithm: "RS256"
			},
			(err, decoded) => {
				if (err) return reject(err);
				resolve(decoded);
			}
		);
	});
}
