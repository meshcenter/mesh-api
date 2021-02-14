import { Router } from "express";

import {
  getLinks,
  getLink,
  createLink,
  updateLink,
  deleteLink,
} from "../db/links";
import { checkAuth } from "../auth";

const router = Router({
  caseSensitive: true,
});

router.get("/", async (req, res) => {
  const links = await getLinks();
  res.json(links);
});

router.get("/:id", async (req, res) => {
  const link = await getLink(req.params.id);
  res.json(link);
});

router.post("/", async (req, res) => {
  await checkAuth(req.headers);
  const links = await createLink(req.body);
  res.json(links);
});

router.delete("/:id", async (req, res) => {
  await checkAuth(req.headers);
  const link = await deleteLink(req.params.id);
  res.json(link);
});

export default router;
