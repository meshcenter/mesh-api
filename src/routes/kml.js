import { Router } from "express";

import { getKML } from "../kml";
import { getAppointmentsKML } from "../kml/appointments";
import { getLosKML } from "../kml/los";
import { getNodesKML } from "../kml/nodes";
import { getRequestsKML } from "../kml/requests";

const router = Router({
  caseSensitive: true,
});

router.get("/", async (req, res) => {
  const kml = await getKML();
  res
    .set({
      "Content-Type": "text/xml",
      "Content-Disposition": `attachment; filename="nycmesh.kml"`,
    })
    .send(kml);
});

router.get("/appointments", async (req, res) => {
  const kml = await getAppointmentsKML(req.params);
  res.set("Content-Type", "text/xml").send(kml);
});

router.get("/los", async (req, res) => {
  const kml = await getLosKML(req.params);
  res.set("Content-Type", "text/xml").send(kml);
});

router.get("/nodes", async (req, res) => {
  const kml = await getNodesKML(req.params);
  res.set("Content-Type", "text/xml").send(kml);
});

router.get("/requests", async (req, res) => {
  const kml = await getRequestsKML(req.params);
  res.set("Content-Type", "text/xml").send(kml);
});

export default router;
