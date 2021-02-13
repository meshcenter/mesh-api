import { Router } from "express";

import { getAppointment, getAppointments } from "../db/appointments";
import { checkAuth } from "../auth";

const router = Router({
  caseSensitive: true,
});

router.get("", async (req, res, next) => {
  await checkAuth(req.headers);
  const appointments = await getAppointments();
  res.json(appointments);
});

router.get("/:id", async (req, res, next) => {
  await checkAuth(req.headers);
  const appointment = await getAppointment(req.params.id);
  res.json(appointment);
});

export default router;
