export function createResponse(statusCode, body) {
	return {
		statusCode,
		headers: {
			"content-type": "application/json"
		},
		body: JSON.stringify(body, null, 2)
	};
}
