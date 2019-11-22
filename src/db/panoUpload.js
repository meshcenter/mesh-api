import AWS from "aws-sdk";

const s3 = new AWS.S3({
	endpoint: process.env.SPACES_ENDPOINT,
	accessKeyId: process.env.SPACES_ID,
	secretAccessKey: process.env.SPACES_KEY
});

export async function getUploadURL(name, type) {
	const params = JSON.parse(event.body);
	const url = await s3.getSignedUrl("putObject", {
		Bucket: process.env.SPACES_BUCKET,
		Key: name,
		ContentType: type,
		ACL: "public-read"
	});
	return {
		statusCode: 200,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "http://localhost:3000",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
			"Access-Control-Allow-Methods": "OPTIONS, POST, GET"
		},
		body: JSON.stringify({ url }, null, 2)
	};
}
