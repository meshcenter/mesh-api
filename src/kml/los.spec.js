import { performQuery } from "../db";
jest.mock("../db");
import { getLosKML } from "./los";

describe("getLosKML", () => {
  it("renders KML for line-of-sight from a request to other nodes", async () => {
    performQuery.mockResolvedValue([
      {
        requests: [ { id: 5111 } ],
        nodes: [],
        building_a_id: 8331,
        building_b_id: 2034,
        lat_a: '40.645353',
        lng_a: '-74.0152093',
        alt_a: '100m',
        lat_b: '40.6123248',
        lng_b: '-73.9123421',
        alt_b: '150m',
      },
      {
        requests: [ { id: 6111 } ],
        nodes: [ { id: 110 } ],
        building_a_id: 4113,
        building_b_id: 1322,
        lat_a: '39.114023',
        lng_a: '-75.120532',
        alt_a: '50m',
        lat_b: '41.001234',
        lng_b: '-73.144110',
        alt_b: '90m',
      },
    ]);

    expect(await getLosKML()).toMatchSnapshot();
  });
});
