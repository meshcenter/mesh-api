import fetch from "node-fetch";
import { getLos, getBuildingHeightMeters } from "./los";
import { requestMessage } from "../slack";
import { performQuery } from ".";

const getRequestQuery = `SELECT
  requests.*,
  to_json(buildings) AS building,
  to_json(members) AS member,
  COALESCE(json_agg(DISTINCT panoramas) FILTER (WHERE panoramas IS NOT NULL), '[]') AS panoramas
FROM
  requests
  JOIN buildings ON requests.building_id = buildings.id
  JOIN members ON requests.member_id = members.id
  LEFT JOIN panoramas ON requests.id = panoramas.request_id
WHERE
  requests.id = $1
GROUP BY
  requests.id,
  buildings.id,
  members.id`;

export async function getRequest(id) {
  if (!Number.isInteger(parseInt(id, 10))) throw new Error("Bad params");
  const [request] = await performQuery(getRequestQuery, [id]);
  if (!request) throw new Error("Not found");
  return request;
}

const getRequestsQuery = `SELECT
  requests.*,
  to_json(buildings) AS building,
  to_json(members) AS member
FROM
  requests
  LEFT JOIN buildings ON requests.building_id = buildings.id
  LEFT JOIN members ON requests.member_id = members.id
GROUP BY
  requests.id,
  buildings.id,
  members.id
ORDER BY
  date DESC`;

export async function getRequests() {
  return performQuery(getRequestsQuery);
}

export async function createRequest(request, slackClient) {
  const {
    name,
    email,
    phone,
    address,
    apartment,
    roof_access,
    roofAccess,
    spreadsheetId,
  } = request;

  const isInvalid = !name || !email || !phone || !address || !apartment;
  if (!spreadsheetId && isInvalid) {
    throw new Error("Invalid request");
  }

  // Geocode address
  let { lat, lng, bin } = request;
  try {
    const googleData = await getGoogleData(address);
    const nycData = await getNycData(address, lat, lng);
    lat = googleData.geometry.location.lat || nycData.lat;
    lng = googleData.geometry.location.lng || nycData.lng;
    bin = nycData.bin;
  } catch (error) {
    console.log(error);
  }

  const alt = await getBuildingHeightMeters(bin);

  // Look up building by bin
  let building;
  try {
    [building] = await performQuery("SELECT * FROM buildings WHERE bin = $1", [
      request.bin,
    ]);
  } catch (error) {
    console.log(error);
  }

  // Look up building by address
  if (!building) {
    [
      building,
    ] = await performQuery("SELECT * FROM buildings WHERE address = $1", [
      address,
    ]);
  }

  // Create building if new
  if (!building) {
    [
      building,
    ] = await performQuery(
      "INSERT INTO buildings (address, lat, lng, alt, bin) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [address, lat, lng, alt, bin]
    );
  }

  // Look up member by email
  let [member] = await performQuery("SELECT * FROM members WHERE email = $1", [
    email,
  ]);

  // Create member if new
  if (!member) {
    [
      member,
    ] = await performQuery(
      "INSERT INTO members (name, email, phone) VALUES ($1, $2, $3) RETURNING *",
      [name, email, phone]
    );
  }

  // Insert request
  const now = new Date();
  let [
    dbRequest,
  ] = await performQuery(
    "INSERT INTO requests (date, apartment, roof_access, member_id, building_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [now, apartment, roof_access || roofAccess, member.id, building.id]
  );

  // Get los
  let visibleNodes = [];
  try {
    const { visibleSectors, visibleOmnis } = await getLos(bin);
    visibleNodes.push(...visibleSectors, ...visibleOmnis);
  } catch (error) {
    console.log("Failed to get line of sight");
    console.log(error);
  }

  // Send Slack message and save timestamp to db
  try {
    const slackRequest = {
      ...dbRequest,
      id: spreadsheetId || dbRequest.id,
    };
    const slack_ts = await sendSlackMessage({
      slackRequest,
      request,
      building,
      visibleNodes,
      slackClient,
    });
    await performQuery(
      "UPDATE requests SET slack_ts = $1 WHERE id = $2 RETURNING *",
      [slack_ts, dbRequest.id]
    );
  } catch (error) {
    console.log(error);
  }

  dbRequest = await getRequest(dbRequest.id);

  return dbRequest;
}

async function sendSlackMessage({
  request,
  building,
  visibleNodes,
  slackClient,
}) {
  const buildingNodes = await performQuery(
    "SELECT * FROM nodes WHERE nodes.building_id = $1 AND nodes.status = 'active'",
    [request.building_id]
  );
  const { ts } = await requestMessage(
    slackClient,
    request,
    building,
    visibleNodes,
    buildingNodes
  );
  return ts;
}

const updateRequestQuery = `UPDATE
  requests
SET
  status = $2, 
  apartment = $3, 
  roof_access = $4
WHERE
  id = $1
RETURNING
  *`;

export async function updateRequest(id, patch) {
  const existingRequest = await getRequest(id, true);

  // TODO: Sanitize / validated new values!!

  const newRequest = {
    ...existingRequest,
    ...patch,
  };

  const values = [
    id,
    newRequest.status,
    newRequest.apartment,
    newRequest.roof_access,
  ];
  await performQuery(updateRequestQuery, values);

  const updatedRequest = await getRequest(id);
  return updatedRequest;
}

// https://docs.osticket.com/en/latest/Developer%20Documentation/API/Tickets.html
async function createTicket(request, building, member) {
  const { id, date } = request;
  const { address, lat, lng } = building;
  const { name, email, phone } = member;

  const subject = `NYC Mesh Install`;
  const message = address;

  const url = "http://devsupport.nycmesh.net/api/http.php/tickets.json";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.OSTICKET_API_KEY,
    },
    body: JSON.stringify({
      email,
      name,
      subject,
      message,
      phone,
    }),
  });

  const text = await response.text();
  if (response.status !== 201) {
    throw new Error(text);
  }

  return text; // external ticket id of the newly-created ticket
}

async function getGoogleData(address) {
  const encodedAddress = encodeURIComponent(address);
  const params = `address=${encodedAddress}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
  const URL = `https://maps.googleapis.com/maps/api/geocode/json?${params}`;
  const res = await fetch(URL);
  const json = await res.json();
  return json.results[0];
}

async function getOsmData(address) {
  const encodedAddress = encodeURIComponent(address);
  const URL = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json`;
  const res = await fetch(URL);
  const json = await res.json();
  return json[0];
}

async function getNycData(address, buildingLat = 0, buildingLng = 0) {
  const URIaddress = encodeURIComponent(address);
  const URL = `https://geosearch.planninglabs.nyc/v1/search?text=${URIaddress}`;
  const binRes = await fetch(URL);
  const { features } = await binRes.json();

  if (!features.length) {
    return {};
  }

  const [feature] = features.sort(sortByDistance);
  const { properties, geometry } = feature;
  const bin = properties.pad_bin;
  const [lng, lat] = geometry.coordinates;

  return {
    lat,
    lng,
    bin,
  };

  function sortByDistance(a, b) {
    const buildingLatLng = [buildingLng, buildingLat];
    const distanceA = distance(a.geometry.coordinates, buildingLatLng);
    const distanceB = distance(b.geometry.coordinates, buildingLatLng);
    return distanceA - distanceB;
  }

  function distance(a, b) {
    const xDiff = a[0] - b[0];
    const yDiff = a[1] - b[1];
    return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
  }
}
