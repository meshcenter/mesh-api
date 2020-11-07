import { performQuery } from '../db';
jest.mock('../db');
import { getNodesKML } from './nodes';

describe('getNodesKML', () => {
  it('generates KML for all the nodes', async () => {
    const nodes = [
      {
        id: 9999,
        status: "active",
        create_date: new Date("2019-12-21"),
        device_types: [
          { name: "Omni" },
          { name: "LBE" },
        ],
        panoramas: [
          { url: "https://imgur.com/9999" },
        ],
        lat: '33.123414',
        lng: '-71.123413',
        alt: '230m',
      },
      {
        id: 9123,
        name: "Saratoga",
        status: "active",
        create_date: new Date("2016-02-01"),
        device_types: [
          { name: "LiteAP" },
          { name: "AF24" },
        ],
        panoramas: [],
        lat: '33.953245',
        lng: '-74.123410',
        alt: '80m',
      },
      {
        id: 1013,
        status: "inactive",
        create_date: new Date("2014-08-15"),
        device_types: [],
        notes: "hub node",
        panoramas: [
          { url: "https://imgur.com/1013/1" },
          { url: "https://imgur.com/1013/2" },
        ],
        lat: '31.234524',
        lng: '-75.934582',
        alt: '122m',
      },
    ];

    // getNodes
    performQuery.mockResolvedValueOnce(nodes);

    // getLinks
    performQuery.mockResolvedValueOnce([
      {
        id: 91,
        node_a: nodes[0],
        node_b: nodes[1],
        device_type_a: { name: "LBE" },
        device_type_b: { name: "LiteAP" },
        status: "active",
      },
      {
        id: 92,
        node_a: nodes[2],
        node_b: nodes[1],
        device_type_a: { name: "Unknown" },
        device_type_b: { name: "LiteAP" },
        status: "inactive",
      },
    ]);

    expect(await getNodesKML()).toMatchSnapshot();
  });
});
