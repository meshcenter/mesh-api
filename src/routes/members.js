import { Router } from "express";

import {
  getMembers,
  getMember,
  createMember,
  updateMember,
} from "../db/members";
import { checkAuth } from "../auth";

const router = Router({
  caseSensitive: true,
});

router.get("/", async (req, res) => {
  await checkAuth(req.headers);
  const members = await getMembers();
  res.json(members);
});

router.get("/:id", async (req, res) => {
  await checkAuth(req.headers);
  const member = await getMember(req.params.id);
  res.json(member);
});

router.get("/search", async (req, res) => {
  await checkAuth(req.headers);
  const members = await authorizedSearchMembers(req.query.s);
  res.json(members);
});

export default router;
