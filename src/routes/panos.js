import { Router } from "express";

import { savePano, getUploadURL } from "../db/panos";
import { checkAuth } from "../auth";
import SlackClient from "../slack/client";

const slackClient = new SlackClient(process.env.SLACK_TOKEN);

const router = Router({
  caseSensitive: true,
});

router.post("/", async (req, res) => {
  const pano = await savePano(
    req.body.requestId,
    req.body.panoURL,
    slackClient
  );
  res.json(pano);
});

router.post("/upload", async (req, res) => {
  const url = await getUploadURL(req.body.name, req.body.type);
  res.json({ url });
});

export default router;
