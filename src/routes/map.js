import { Router } from "express";

import { getMap } from "../db/map";
import { checkAuth } from "../auth";

const router = Router({
  caseSensitive: true,
});

router.get("/", async (req, res) => {
  let map;
  try {
    await checkAuth(req.headers);
    map = await getMap(true);
  } catch (error) {
    map = await getMap();
  }
  res.json(map);
});

export default router;
