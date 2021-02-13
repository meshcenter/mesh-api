import { Router } from "express";

import {
  getSearch,
  authorizedSearchMembers,
  authorizedSearchDeviceTypes,
} from "../db/search";
import { checkAuth } from "../auth";

const router = Router({
  caseSensitive: true,
});

router.get("/", async (req, res) => {
  let results;
  try {
    await checkAuth(req.headers);
    const authorized = true;
    results = await getSearch(req.query.s, authorized);
  } catch (error) {
    results = await getSearch(req.query.s);
  }
  res.json(results);
});

export default router;
