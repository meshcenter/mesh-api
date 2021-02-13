import express, { Router } from "express";
import cors from "cors";
import serverless from "serverless-http";

import { checkAuth } from "./auth";

import {
  authorizedGetAppointment,
  authorizedGetAppointments,
} from "./db/appointments";
import { getBuildings, getBuilding, updateBuilding } from "./db/buildings";
import { authorizedGetDevice, authorizedCreateDevice } from "./db/devices";
import { getLinks, getLink, createLink, deleteLink } from "./db/links";
import { getLos } from "./db/los";
import { getMap } from "./db/map";
import { getMembers, getMember } from "./db/members";
import {
  createMembership,
  destroyMembership,
  findMembership,
} from "./db/memberships";
import { getNodes, getNode, createNode, updateNode } from "./db/nodes";
import { savePano, getUploadURL } from "./db/panos";
import {
  getRequests,
  getRequest,
  createRequest,
  updateRequest,
} from "./db/requests";
import {
  getSearch,
  authorizedSearchMembers,
  authorizedSearchDeviceTypes,
} from "./db/search";

import { getKML } from "./kml";
import { getAppointmentsKML } from "./kml/appointments";
import { getLosKML } from "./kml/los";
import { getNodesKML } from "./kml/nodes";
import { getRequestsKML } from "./kml/requests";

import { getNodesGeoJSON } from "./geojson/nodes";

import SlackClient from "./slack/client";

import { acuityWebhook } from "./webhooks/acuity";

const ROOT = "/v1";
const app = express(ROOT);

const slackClient = new SlackClient(process.env.SLACK_TOKEN);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("etag", false);
app.disable("x-powered-by");

const router = Router({
  caseSensitive: true,
});

router.get(
  "/appointments",
  handleErrors(async (req, res, next) => {
    await checkAuth(req.headers);
    const appointments = await authorizedGetAppointments();
    res.json(appointments);
  })
);

router.get(
  "/appointments/:id",
  handleErrors(async (req, res, next) => {
    await checkAuth(req.headers);
    const appointment = await authorizedGetAppointment(req.params.id);
    res.json(appointment);
  })
);

router.get(
  "/buildings",
  handleErrors(async (req, res, next) => {
    await checkAuth(req.headers);
    const buildings = await getBuildings();
    res.json(buildings);
  })
);

router.get(
  "/buildings/:id",
  handleErrors(async (req, res, next) => {
    await checkAuth(req.headers);
    const building = await getBuilding(req.params.id);
    res.json(building);
  })
);

router.post(
  "/buildings/:id",
  handleErrors(async (req, res, next) => {
    await checkAuth(req.headers);
    const building = await updateBuilding(req.params.id, req.body);
    res.json(building);
  })
);

router.get(
  "/device_types/search",
  handleErrors(async (req, res, next) => {
    await checkAuth(req.headers);
    const types = await authorizedSearchDeviceTypes(req.query.s);
    res.json(types);
  })
);

router.post(
  "/devices",
  handleErrors(async (req, res, next) => {
    await checkAuth(req.headers);
    const device = await authorizedCreateDevice(req.body);
    res.json(device);
  })
);

router.get(
  "/devices/:id",
  handleErrors(async (req, res, next) => {
    await checkAuth(req.headers);
    const types = await authorizedGetDevice(req.params.id);
    res.json(types);
  })
);

router.get(
  "/links/:id",
  handleErrors(async (req, res, next) => {
    const link = await getLink(req.params.id);
    res.json(link);
  })
);

router.get(
  "/links",
  handleErrors(async (req, res, next) => {
    const links = await getLinks();
    res.json(links);
  })
);

router.post(
  "/links",
  handleErrors(async (req, res, next) => {
    await checkAuth(req.headers);
    const links = await createLink(req.body);
    res.json(links);
  })
);

router.delete(
  "/links/:id",
  handleErrors(async (req, res, next) => {
    await checkAuth(req.headers);
    const link = await deleteLink(req.params.id);
    res.json(link);
  })
);

router.get(
  "/los",
  handleErrors(async (req, res, next) => {
    const los = await getLos(parseInt(req.query.bin));
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
  "/members/search",
  handleErrors(async (req, res, next) => {
    await checkAuth(req.headers);
    const members = await authorizedSearchMembers(req.query.s);
    res.json(members);
  })
);

router.get(
  "/members/:id",
  handleErrors(async (req, res, next) => {
    await checkAuth(req.headers);
    const member = await getMember(req.params.id);
    res.json(member);
  })
);

router.get(
  "/map",
  handleErrors(async (req, res, next) => {
    let map;
    try {
      await checkAuth(req.headers);
      map = await getMap(true);
    } catch (error) {
      map = await getMap();
    }
    res.json(map);
  })
);

router.get(
  "/nodes",
  handleErrors(async (req, res, next) => {
    const nodes = await getNodes();
    res.json(nodes);
  })
);

router.get(
  "/nodes/:id",
  handleErrors(async (req, res, next) => {
    let node;
    try {
      await checkAuth(req.headers);
      node = await getNode(req.params.id, true);
    } catch (error) {
      node = await getNode(req.params.id);
    }
    res.json(node);
  })
);

router.post(
  "/nodes",
  handleErrors(async (req, res, next) => {
    await checkAuth(req.headers);
    const node = await createNode(req.body);
    res.json(node);
  })
);

router.post(
  "/nodes/:id",
  handleErrors(async (req, res, next) => {
    await checkAuth(req.headers);
    const node = await updateNode(req.params.id, req.body);
    res.json(node);
  })
);

router.post(
  "/nodes/:node_id/memberships",
  handleErrors(async (req, res, next) => {
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
  })
);

router.delete(
  "/memberships/:id",
  handleErrors(async (req, res, next) => {
    await checkAuth(req.headers);
    const membership = await destroyMembership(req.params.id);

    if (!membership) {
      notFound();
    }

    res.json({});
  })
);

router.post(
  "/panos",
  handleErrors(async (req, res, next) => {
    const pano = await savePano(
      req.body.requestId,
      req.body.panoURL,
      slackClient
    );
    res.json(pano);
  })
);

router.post(
  "/panos/upload",
  handleErrors(async (req, res, next) => {
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

router.post(
  "/requests",
  handleErrors(async (req, res, next) => {
    const request = await createRequest(req.body, slackClient);
    if (req.body.success_url) {
      res.redirect(200, success_url);
    } else {
      res.json(request);
    }
  })
);

router.post(
  "/requests/:id",
  handleErrors(async (req, res, next) => {
    const request = await updateRequest(req.params.id, req.body);
    res.json(request);
  })
);

router.get(
  "/search",
  handleErrors(async (req, res, next) => {
    let results;
    try {
      await checkAuth(req.headers);
      const authorized = true;
      results = await getSearch(req.query.s, authorized);
    } catch (error) {
      results = await getSearch(req.query.s);
    }
    res.json(results);
  })
);

// KML

router.get(
  "/kml",
  handleErrors(async (req, res, next) => {
    const kml = await getKML();
    res
      .set({
        "Content-Type": "text/xml",
        "Content-Disposition": `attachment; filename="nycmesh.kml"`,
      })
      .send(kml);
  })
);

router.get(
  "/kml/appointments",
  handleErrors(async (req, res, next) => {
    const kml = await getAppointmentsKML(req.params);
    res.set("Content-Type", "text/xml").send(kml);
  })
);

router.get(
  "/kml/los",
  handleErrors(async (req, res, next) => {
    const kml = await getLosKML(req.params);
    res.set("Content-Type", "text/xml").send(kml);
  })
);

router.get(
  "/kml/nodes",
  handleErrors(async (req, res, next) => {
    const kml = await getNodesKML(req.params);
    res.set("Content-Type", "text/xml").send(kml);
  })
);

router.get(
  "/kml/requests",
  handleErrors(async (req, res, next) => {
    const kml = await getRequestsKML(req.params);
    res.set("Content-Type", "text/xml").send(kml);
  })
);

router.get(
  "/kml/",
  handleErrors(async (req, res, next) => {
    const kml = await getKML();
    res.set("Content-Type", "text/xml").send(kml);
  })
);

router.get(
  "/geojson/nodes",
  handleErrors(async (req, res, next) => {
    const geoJSON = await getNodesGeoJSON();
    res.json(geoJSON);
  })
);

router.get(
  "/webhooks/acuity",
  handleErrors(async (req, res, next) => {
    acuityWebhook(req.body, slackClient);
    res.send({});
  })
);

app.use(ROOT, router);

app.use(function (error, req, res, next) {
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

  if (req.body.failure_url) {
    res.redirect(303, req.body.failure_url);
  } else {
    res.status(status).json({ error: error.message });
  }
});

export const handler = serverless(app);

// TODO: Something better than this
function handleErrors(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

function notFound() {
  throw new Error("Not found");
}
