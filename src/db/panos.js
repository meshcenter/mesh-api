import AWS from "aws-sdk";
import { performQuery } from ".";

const insertPanoQuery =
	"INSERT INTO panoramas (url, date, request_id) VALUES ($1, $2, $3) RETURNING id";

const s3 = new AWS.S3({
	endpoint: process.env.S3_ENDPOINT,
	accessKeyId: process.env.S3_ID,
	secretAccessKey: process.env.S3_KEY
});

// TODO: Restrict this somehow. Maybe require a secret?
export async function savePano(requestId, panoURL) {
	if (!requestId || !panoURL) throw new Error("Bad params");
	const values = [panoURL, new Date(), requestId];
	const [pano] = await performQuery(insertPanoQuery, values);
	return pano;
}

export async function getUploadURL(name, type) {
	if (!name || !type) throw new Error("Bad params");
	const url = await s3.getSignedUrl("putObject", {
		Bucket: process.env.S3_BUCKET,
		Key: name,
		ContentType: type,
		ACL: "public-read"
	});
	return url;
}
