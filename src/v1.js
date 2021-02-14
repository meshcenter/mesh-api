import express, { Router } from "express";
import cors from "cors";
import serverless from "serverless-http";

import appointments from "./routes/appointments";
import buildings from "./routes/buildings";
import device_types from "./routes/device_types";
import devices from "./routes/devices";
import links from "./routes/links";
import los from "./routes/los";
import members from "./routes/members";
import memberships from "./routes/memberships";
import map from "./routes/map";
import nodes from "./routes/nodes";
import panos from "./routes/panos";
import requests from "./routes/requests";
import search from "./routes/search";
import kml from "./routes/kml";
import geojson from "./routes/geojson";
import webhooks from "./routes/webhooks";

const ROOT = "/v1";
const app = express(ROOT);
const router = Router({ caseSensitive: true });

app.set("etag", false);
app.disable("x-powered-by");
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(ROOT, router);
app.use(handleErrors);

router.use("/appointments", appointments);
router.use("/buildings", buildings);
router.use("/device_types", device_types);
router.use("/devices", devices);
router.use("/geojson", geojson);
router.use("/kml", kml);
router.use("/links", links);
router.use("/los", los);
router.use("/map", map);
router.use("/members", members);
router.use("/memberships", memberships);
router.use("/nodes", nodes);
router.use("/panos", panos);
router.use("/requests", requests);
router.use("/search", search);
router.use("/webhooks", webhooks);

function handleErrors(error, req, res, next) {
  if (req.body.failure_url) {
    res.redirect(303, req.body.failure_url);
  } else {
    const messageStatus = {
      Unauthorized: 401,
      "Bad params": 422,
      "Not found": 400,
    };
    const status = messageStatus[error.message] || 500;
    res.status(status).json({ error: error.message });
  }
}

export const handler = serverless(app);
