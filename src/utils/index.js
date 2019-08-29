export function createResponse(statusCode, body) {
	return {
		statusCode,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*"
		},
		body: JSON.stringify(body, null, 2)
	};
}
