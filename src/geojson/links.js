import { performQuery } from "../db";

export async function getLinksGeoJSON() {
  const links = await getLinks();

  return {
    type: "FeatureCollection",
    features: links.map(linkFeature),
  };
}

function linkFeature(link) {
  const { device_a_lat, device_a_lng, device_b_lat, device_b_lng } = link;
  return {
    type: "Feature",
    properties: {
      id: link.id,
    },
    geometry: {
      type: "LineString",
      coordinates: [
        [device_a_lng, device_a_lat],
        [device_b_lng, device_b_lat],
      ],
    },
  };
}

const getLinksQuery = `SELECT
  links.id,
  device_a.lat AS device_a_lat,
  device_a.lng AS device_a_lng,
  device_b.lat AS device_b_lat,
  device_b.lng AS device_b_lng
FROM
  links
  JOIN devices device_a ON device_a.id = links.device_a_id
  JOIN devices device_b ON device_b.id = links.device_b_id
WHERE
  links.status = 'active'
GROUP BY
  links.id,
  device_a.id,
  device_b.id`;

async function getLinks() {
  return performQuery(getLinksQuery);
}
