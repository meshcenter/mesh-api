import { Router } from "express";

import { acuityWebhook } from "../webhooks/acuity";
import SlackClient from "../slack/client";

const slackClient = new SlackClient(process.env.SLACK_TOKEN);

const router = Router({
  caseSensitive: true,
});

router.get("/acuity", async (req, res) => {
  acuityWebhook(req.body, slackClient);
  res.send({});
});

export default router;
