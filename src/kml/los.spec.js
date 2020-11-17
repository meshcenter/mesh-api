import { performQuery } from "../db";
jest.mock("../db");
import { getLosKML } from "./los";

describe("getLosKML", () => {
  it("renders KML for line-of-sight from a request to other nodes", async () => {
    performQuery.mockResolvedValue([
      {
        id: 3,
        building_a_id: 14,
        building_b_id: 2231,
        lat_a: 40.7413549,
        lng_a: -74.0032029,
        alt_a: 95,
        lat_b: 40.719778,
        lng_b: -73.98809299999999,
        alt_b: 72,
        requests: [
          {
            id: 7059,
            status: 'open',
            apartment: null,
            roof_access: true,
            date: new Date('2020-09-18T12:42:20.811Z'),
            osticket_id: null,
            member_id: 6087,
            building_id: 5758,
            building: {
              id: 5758,
              address: 'Redacted',
              lat: 40.6604126,
              lng: -73.9428339,
              alt: 32,
              bin: 3114902,
              notes: null
            },
            panoramas: null
          },
        ],
        nodes: [
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
        ],
      },
    ]);

    expect(await getLosKML()).toMatchSnapshot();
  });
});
