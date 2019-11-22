import express, { Router } from "express";
import bodyParser from "body-parser";
import serverless from "serverless-http";

import { checkAuth } from "./auth";

import { getBuildings, getBuilding } from "./db/buildings";
import { getLinks } from "./db/links";
import { getLos } from "./db/los";
import { getMembers, getMember } from "./db/members";
import { getNodes, getNode } from "./db/nodes";
import { savePano, getUploadURL } from "./db/panos";
import { getRequests, getRequest } from "./db/requests";
import { getSearch } from "./db/search";

import { getKML } from "./kml";
import { getNodesKML } from "./kml/nodes";
import { getLosKML } from "./kml/los";
import { getRequestsKML } from "./kml/requests";

const app = express("v1");

app.use(bodyParser.json());

const router = Router({
	caseSensitive: true
});

router.get("/buildings", async (req, res) => {
	const buildings = await getBuildings();
	res.json(buildings);
});

router.get("/building/:id", async (req, res) => {
	const building = await getBuilding(req.params.id);
	res.json(building);
});

router.get("/links", async (req, res) => {
	const links = await getLinks();
	res.json(links);
});

router.get("/kml", async (req, res) => {
	const kml = await getKML();
	res.set({
		"Content-Type": "text/xml",
		"Content-Disposition": `attachment; filename="nycmesh.kml"`
	}).send(kml);
});

router.get("/kml/los", async (req, res) => {
	const kml = await getLosKML(req.params);
	res.set("Content-Type", "text/xml");
});

router.get("/kml/nodes", async (req, res) => {
	const kml = await getNodesKML(req.params);
	res.set("Content-Type", "text/xml").send(kml);
});

router.get("/kml/requests", async (req, res) => {
	const kml = await getRequestsKML(req.params);
	res.set("Content-Type", "text/xml").send(kml);
});

router.get("/kml/", async (req, res) => {
	const kml = await getKML();
	res.set("Content-Type", "text/xml").send(kml);
});

router.get("/los", async (req, res) => {
	const los = await getLos(req.query.bin);
	res.json(los);
});

router.get("/members", async (req, res) => {
	try {
		await checkAuth(req);
	} catch (error) {
		return res.status(401).json({ error: error.message });
	}
	const members = await getMembers();
	res.json(members);
});

router.get("/nodes", async (req, res) => {
	const nodes = await getNodes();
	res.json(nodes);
});

router.get("/nodes/:id", async (req, res) => {
	const node = await getNode(req.params.id);
	res.json(node);
});

router.post("/panos", async (req, res) => {
	const pano = await savePano(req.body.requestId, req.body.panoURL);
	res.json(pano);
});

router.post("/panos/upload", async (req, res) => {
	const url = await getUploadURL(req.body.name, req.body.type);
	res.json({ url });
});

router.get("/requests", async (req, res) => {
	try {
		await checkAuth(req);
	} catch (error) {
		return res.status(401).json({ error: error.message });
	}
	const requests = await getRequests();
	res.json(requests);
});

router.get("/requests/:id", async (req, res) => {
	try {
		await checkAuth(req);
	} catch (error) {
		return res.status(401).json({ error: error.message });
	}
	const request = await getRequest(req.params.id);
	res.json(request);
});

router.get("/search", async (req, res) => {
	try {
		await checkAuth(req);
	} catch (error) {
		return res.status(401).json({ error: error.message });
	}
	const results = await getSearch(req.params.s);
	res.json(results);
});

app.use("v1", router);

const serverlessApp = serverless(app);

export async function handler(event, context) {
	const result = await serverlessApp(event, context);
	return result;
}
