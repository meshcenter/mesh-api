import { Router } from "express";

import {
  createMembership,
  destroyMembership,
  findMembership,
} from "../db/memberships";
import { checkAuth } from "../auth";

const router = Router({
  caseSensitive: true,
});

router.delete("/:id", async (req, res) => {
  await checkAuth(req.headers);
  const membership = await destroyMembership(req.params.id);

  if (!membership) {
    throw new Error("Not found");
  }

  res.json({});
});

export default router;
