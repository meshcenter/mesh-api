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
import map from "./routes/map";
import nodes from "./routes/nodes";
import panos from "./routes/panos";
import requests from "./routes/requests";
import search from "./routes/search";
import kml from "./routes/kml";
import geoJSON from "./routes/geojson";
import webhooks from "./routes/webhooks";

const router = Router({ caseSensitive: true });

router.use("/appointments", appointments);
router.use("/buildings", buildings);
router.use("/device_types", device_types);
router.use("/devices", devices);
router.use("/links", links);
router.use("/los", los);
router.use("/members", members);
router.use("/map", map);
router.use("/nodes", nodes);
router.use("/panos", panos);
router.use("/requests", requests);
router.use("/search", search);
router.use("/kml", kml);
router.use("/geojson", geoJSON);
router.use("/webhooks", webhooks);

const ROOT = "/v1";
const app = express(ROOT);

app.set("etag", false);
app.disable("x-powered-by");
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(ROOT, router);
app.use(handleErrors);

function handleErrors(error, req, res, next) {
  let status;
  if (error.message === "Unauthorized") {
    status = 401;
  } else if (error.message === "Bad params") {
    status = 422;
  } else if (error.message === "Not found") {
    status = 404;
  } else {
    status = 500;
  }

  if (req.body.failure_url) {
    res.redirect(303, req.body.failure_url);
  } else {
    res.status(status).json({ error: error.message });
  }
}

export const handler = serverless(app);
