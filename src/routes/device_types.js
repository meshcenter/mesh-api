import { Router } from "express";

import {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
} from "../db/devices";
import { checkAuth } from "../auth";

const router = Router({
  caseSensitive: true,
});

router.get("/search", async (req, res) => {
  await checkAuth(req.headers);
  const types = await authorizedSearchDeviceTypes(req.query.s);
  res.json(types);
});

export default router;
