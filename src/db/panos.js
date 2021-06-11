import AWS from "aws-sdk";
import { panoMessage } from "../slack";
import { getRequest } from "./requests";
import { performQuery } from ".";

const s3 = new AWS.S3({
  endpoint: process.env.S3_ENDPOINT,
  accessKeyId: process.env.S3_ID,
  secretAccessKey: process.env.S3_KEY,
});

export async function getUploadURL(name, type) {
  if (!name || !type) throw new Error("Bad params");

  // const timestamp =

  // TODO: Validate content type?

  const url = await s3.getSignedUrl("putObject", {
    Bucket: process.env.S3_BUCKET,
    Key: name,
    ContentType: type,
    ACL: "public-read",
  });

  return url;
}

export async function createPano({ url, request_id }, slackClient) {
  if (!url) throw new Error("Bad params");

  const [
    pano,
  ] = await performQuery(
    "INSERT INTO panoramas (url, date, request_id) VALUES ($1, $2, $3) RETURNING *",
    [url, new Date(), request_id]
  );

  try {
    const request = await getRequest(request_id);
    await panoMessage(slackClient, pano, request);
  } catch (error) {
    console.log("Failed to send pano slack message!");
    console.log(error.message);
  }

  return pano;
}
