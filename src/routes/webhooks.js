import express, { Router } from "express";
import Acuity from "acuityscheduling";

import { acuityWebhook } from "../webhooks/acuity";
import SlackClient from "../slack/client";

const router = Router({
  caseSensitive: true,
});

const verifyMiddleware = express.urlencoded({
  verify: Acuity.bodyParserVerify(process.env.ACUITY_API_KEY),
});

const slackClient = new SlackClient(process.env.SLACK_TOKEN);

router.post("/acuity", verifyMiddleware, async (req, res) => {
  await acuityWebhook(req.body, slackClient);
  res.send({});
});

export default router;
