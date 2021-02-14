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

router.post("/", async (req, res) => {
  await checkAuth(req.headers);
  const device = await authorizedCreateDevice(req.body);
  res.json(device);
});

router.get("/:id", async (req, res) => {
  await checkAuth(req.headers);
  const types = await authorizedGetDevice(req.params.id);
  res.json(types);
});

export default router;
