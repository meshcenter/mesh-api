import { performQuery } from "../db";

export async function getNodesGeoJSON() {
  const nodes = await getNodes();

  return {
    type: "FeatureCollection",
    features: nodes.map(nodeFeature),
  };
}

function nodeFeature(node) {
  return {
    type: "Feature",
    properties: {
      id: node.id,
    },
    geometry: {
      type: "Point",
      coordinates: [node.lng, node.lat],
    },
  };
}

const getNodesQuery = `SELECT
  nodes.id,
  nodes.lat,
  nodes.lng
FROM
  nodes
WHERE
  nodes.status = 'active'
ORDER BY
  nodes.id`;

async function getNodes() {
  return performQuery(getNodesQuery);
}
