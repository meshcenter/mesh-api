import { Router } from "express";

import {
  getMembers,
  getMember,
  createMember,
  updateMember,
} from "../db/members";
import { authorizedSearchMembers } from "../db/search";
import { checkAuth } from "../auth";

const router = Router({
  caseSensitive: true,
});

router.get("/", async (req, res) => {
  await checkAuth(req.headers);
  const members = await getMembers();
  res.json(members);
});

router.get("/search", async (req, res) => {
  await checkAuth(req.headers);
  const members = await authorizedSearchMembers(req.query.s);
  res.json(members);
});

router.get("/:id", async (req, res) => {
  await checkAuth(req.headers);
  const member = await getMember(req.params.id);
  res.json(member);
});

export default router;
