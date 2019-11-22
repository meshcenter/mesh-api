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

// TODO: Something better than this handleErrors wrapper

const ROOT = "/v1";
const app = express(ROOT);

app.use(bodyParser.json());

const router = Router({
	caseSensitive: true
});

router.get(
	"/buildings",
	handleErrors(async (req, res) => {
		const buildings = await getBuildings();
		res.json(buildings);
	})
);

router.get(
	"/building/:id",
	handleErrors(async (req, res) => {
		const building = await getBuilding(req.params.id);
		res.json(building);
	})
);

router.get(
	"/links",
	handleErrors(async (req, res) => {
		const links = await getLinks();
		res.json(links);
	})
);

router.get(
	"/los",
	handleErrors(async (req, res) => {
		const los = await getLos(req.query.bin);
		res.json(los);
	})
);

router.get(
	"/members",
	handleErrors(async (req, res, next) => {
		await checkAuth(req.headers);
		const members = await getMembers();
		res.json(members);
	})
);

router.get(
	"/nodes",
	handleErrors(async (req, res) => {
		const nodes = await getNodes();
		res.json(nodes);
	})
);

router.get(
	"/nodes/:id",
	handleErrors(async (req, res) => {
		const node = await getNode(req.params.id);
		res.json(node);
	})
);

router.post(
	"/panos",
	handleErrors(async (req, res) => {
		const pano = await savePano(req.body.requestId, req.body.panoURL);
		res.json(pano);
	})
);

router.post(
	"/panos/upload",
	handleErrors(async (req, res) => {
		const url = await getUploadURL(req.body.name, req.body.type);
		res.json({ url });
	})
);

router.get(
	"/requests",
	handleErrors(async (req, res, next) => {
		await checkAuth(req.headers);
		const requests = await getRequests();
		res.json(requests);
	})
);

router.get(
	"/requests/:id",
	handleErrors(async (req, res, next) => {
		await checkAuth(req.headers);
		const request = await getRequest(req.params.id);
		res.json(request);
	})
);

router.get(
	"/search",
	handleErrors(async (req, res, next) => {
		await checkAuth(req.headers);
		const results = await getSearch(req.params.s);
		res.json(results);
	})
);

// KML

router.get(
	"/kml",
	handleErrors(async (req, res) => {
		const kml = await getKML();
		res.set({
			"Content-Type": "text/xml",
			"Content-Disposition": `attachment; filename="nycmesh.kml"`
		}).send(kml);
	})
);

router.get(
	"/kml/los",
	handleErrors(async (req, res) => {
		const kml = await getLosKML(req.params);
		res.set("Content-Type", "text/xml").send(kml);
	})
);

router.get(
	"/kml/nodes",
	handleErrors(async (req, res) => {
		const kml = await getNodesKML(req.params);
		res.set("Content-Type", "text/xml").send(kml);
	})
);

router.get(
	"/kml/requests",
	handleErrors(async (req, res) => {
		const kml = await getRequestsKML(req.params);
		res.set("Content-Type", "text/xml").send(kml);
	})
);

router.get(
	"/kml/",
	handleErrors(async (req, res) => {
		const kml = await getKML();
		res.set("Content-Type", "text/xml").send(kml);
	})
);

app.use(ROOT, router);

app.use(function(error, req, res, next) {
	let status;
	if (error.message === "Unauthorized") {
		status = 401;
	} else if (error.message === "Bad params") {
		status = 422;
	} else if (error.message === "Not found") {
		status = 404;
	} else {
		status = 500;
	}
	res.status(status).json({ error: error.message });
});

const serverlessApp = serverless(app);

export async function handler(event, context) {
	return serverlessApp(event, context);
}

function handleErrors(fn) {
	return (req, res, next) => {
		fn(req, res, next).catch(next);
	};
}
