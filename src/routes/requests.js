import { Router } from "express";

import {
  getRequests,
  getRequest,
  createRequest,
  updateRequest,
  getRequestFromToken,
} from "../db/requests";
import { checkAuth } from "../auth";
import SlackClient from "../slack/client";

const slackClient = new SlackClient(process.env.SLACK_TOKEN);

const router = Router({
  caseSensitive: true,
});

router.get("/", async (req, res, next) => {
  await checkAuth(req.headers);
  const requests = await getRequests();
  res.json(requests);
});

router.get("/:id", async (req, res, next) => {
  await checkAuth(req.headers);
  const request = await getRequest(req.params.id);
  res.json(request);
});

router.post("/", async (req, res, next) => {
  const request = await createRequest(req.body, slackClient);
  if (req.body.success_url) {
    res.redirect(200, success_url);
  } else {
    res.json(request);
  }
});

router.post("/token/:token", async (req, res, next) => {
  const request = await getRequestFromToken(req.params.token);
  res.json(request);
});

export default router;
