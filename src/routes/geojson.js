import { Router } from "express";

import { getLinksGeoJSON } from "../geojson/links";
import { getNodesGeoJSON } from "../geojson/nodes";
import { checkAuth } from "../auth";

const router = Router({
  caseSensitive: true,
});

router.get("/links", async (req, res) => {
  const geoJSON = await getLinksGeoJSON();
  res.json(geoJSON);
});

router.get("/nodes", async (req, res) => {
  const geoJSON = await getNodesGeoJSON();
  res.json(geoJSON);
});

export default router;
