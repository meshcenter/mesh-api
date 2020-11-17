import { performQuery } from '../db';
jest.mock('../db');
import { getNodesKML } from './nodes';

describe('getNodesKML', () => {
  it('generates KML for all the nodes', async () => {
    const nodes = [
      {
        id: 7290,
        lat: 40.7171001,
        lng: -73.9945616,
        alt: 35,
        status: 'active',
        location: 'Redacted',
        name: null,
        notes: 'Omni port 3',
        create_date: new Date('2020-11-08T05:00:00.000Z'),
        abandon_date: null,
        building_id: 4750,
        member_id: 1299,
        address: 'Redacted',
        devices: [
          {
            id: 800,
            lat: 40.7171001,
            lng: -73.9945616,
            alt: 35,
            azimuth: 0,
            status: 'active',
            name: null,
            ssid: null,
            notes: null,
            create_date: '2020-11-08T00:00:00-05:00',
            abandon_date: null,
            device_type_id: 1,
            node_id: 7290
          }
        ],
        device_types: [
          { id: 1, name: 'Omni', manufacturer: null, range: 0.5, width: 360 }
        ],
        panoramas: [
          {
            id: 1869,
            url: 'https://node-db.netlify.com/panoramas/5547.jpg',
            date: '2020-02-29T14:04:09.779-05:00',
            request_id: 5547
          },
          {
            id: 2262,
            url: 'https://node-db.netlify.com/panoramas/7347.jpg',
            date: '2020-10-17T20:11:42.745-04:00',
            request_id: 7347
          },
          {
            id: 2263,
            url: 'https://node-db.netlify.com/panoramas/7347a.jpg',
            date: '2020-10-17T20:11:42.745-04:00',
            request_id: 7347
          },
          null
        ],
      },
    ];

    // getNodes
    performQuery.mockResolvedValueOnce(nodes);

    // getLinks
    performQuery.mockResolvedValueOnce([
      {
        id: 166,
        status: 'active',
        create_date: new Date('2019-03-30T04:00:00.000Z'),
        device_a_id: 442,
        device_b_id: 5,
        device_a: {
          id: 442,
          lat: 40.7252828,
          lng: -73.9884895,
          alt: 29,
          azimuth: 0,
          status: 'active',
          name: null,
          ssid: null,
          notes: null,
          create_date: '2019-03-30T00:00:00-04:00',
          abandon_date: null,
          device_type_id: 9,
          node_id: 3072
        },
        device_b: {
          id: 5,
          lat: 40.7111043,
          lng: -74.00127188,
          alt: 180,
          azimuth: 300,
          status: 'active',
          name: 'SN1',
          ssid: null,
          notes: null,
          create_date: '2016-11-18T00:00:00-05:00',
          abandon_date: null,
          device_type_id: 4,
          node_id: 227
        },
        device_type_a: { id: 9, name: 'Unknown', manufacturer: null, range: 0, width: 0 },
        device_type_b: {
          id: 4,
          name: 'SN1Sector2',
          manufacturer: null,
          range: 0.75,
          width: 90
        },
        node_a: {
          id: 3072,
          lat: 40.7252828,
          lng: -73.9884895,
          alt: 29,
          status: 'active',
          location: 'Redacted',
          name: null,
          notes: null,
          create_date: '2019-03-30T00:00:00-04:00',
          abandon_date: null,
          building_id: 2719,
          member_id: 2710
        },
        node_b: {
          id: 227,
          lat: 40.7111043,
          lng: -74.00127188,
          alt: 180,
          status: 'active',
          location: '375 Pearl Street, Manhattan, New York 10038',
          name: 'Supernode 1',
          notes: 'Supernode 1, Sector facing North',
          create_date: '2016-11-18T00:00:00-05:00',
          abandon_date: null,
          building_id: 219,
          member_id: 213
        },
      },
    ]);

    expect(await getNodesKML()).toMatchSnapshot();
  });
});
