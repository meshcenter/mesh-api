import { Router } from "express";

import {
  getNodes,
  getNode,
  authorizedGetNode,
  createNode,
  updateNode,
} from "../db/nodes";
import { checkAuth } from "../auth";

const router = Router({
  caseSensitive: true,
});

router.get("/", async (req, res) => {
  const nodes = await getNodes();
  res.json(nodes);
});

router.get("/:id", async (req, res) => {
  let node;
  try {
    await checkAuth(req.headers);
    node = await authorizedGetNode(req.params.id, true);
  } catch (error) {
    node = await getNode(req.params.id);
  }
  res.json(node);
});

router.post("/", async (req, res) => {
  await checkAuth(req.headers);
  const node = await createNode(req.body);
  res.json(node);
});

router.post("/:id", async (req, res) => {
  await checkAuth(req.headers);
  const node = await updateNode(req.params.id, req.body);
  res.json(node);
});

router.post("/:node_id/memberships", async (req, res) => {
  await checkAuth(req.headers);
  const membership = await findMembership(
    req.params.node_id,
    req.body.member_id
  );

  if (membership) {
    res.status(422).json({
      error: "A membership with that node_id and member_id already exists",
    });
    return;
  }

  await createMembership(req.params.node_id, req.body);
  const node = await getNode(req.params.node_id, true);
  res.json(node);
});

export default router;
