import { Router } from "express";

import { getLos } from "../db/los";

const router = Router({
  caseSensitive: true,
});

router.get("/", async (req, res) => {
  const los = await getLos(parseInt(req.query.bin));
  res.json(los);
});

export default router;
