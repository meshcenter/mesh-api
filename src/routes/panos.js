import { Router } from "express";

import { checkAuth } from "../auth";

import { createPano, getUploadURL } from "../db/panos";
import { getRequestFromToken } from "../db/requests";
import SlackClient from "../slack/client";

const slackClient = new SlackClient(process.env.SLACK_TOKEN);

const router = Router({
  caseSensitive: true,
});

router.post("/upload", async (req, res) => {
  if (req.params.token) {
    await checkToken(req.params.token);
  } else {
    await checkAuth(req.headers);
  }
  const url = await getUploadURL(req.body.name, req.body.type);
  res.json({ url });
});

router.post("/createPano", async (req, res) => {
  const params = {
    url: req.body.panoURL,
  };

  if (req.params.token) {
    const request = await getRequestFromToken();
    params.request_id = request.id;
  } else {
    await checkAuth(req.headers);
    params.request_id = request.body.request_id;
  }

  const pano = await createPano(params, slackClient);
  res.json(pano);
});

export default router;
