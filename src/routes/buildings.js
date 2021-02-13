import { Router } from "express";

import { getBuildings, getBuilding, updateBuilding } from "../db/buildings";
import { checkAuth } from "../auth";

const router = Router({
  caseSensitive: true,
});

router.get("/", async (req, res) => {
  await checkAuth(req.headers);
  const buildings = await getBuildings();
  res.json(buildings);
});

router.get("/:id", async (req, res) => {
  await checkAuth(req.headers);
  const building = await getBuilding(req.params.id);
  res.json(building);
});

router.post("/:id", async (req, res) => {
  await checkAuth(req.headers);
  const building = await updateBuilding(req.params.id, req.body);
  res.json(building);
});

export default router;
