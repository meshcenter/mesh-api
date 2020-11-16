import { performQuery } from "../db";
jest.mock("../db");
import { getAppointmentsKML } from "./appointments";

describe("getAppointmentsKML", () => {
  it("renders KML for the retrieved list of appointments", async () => {
    performQuery.mockResolvedValue([
      {
        id: 1,
        type: 'install',
        date: new Date('2020-12-04T18:00:00.000Z'),
        notes: null,
        request_id: 1810,
        member_id: 1668,
        building_id: 1672,
        node_id: null,
        acuity_id: 472552065,
        slack_ts: null,
        address: '123 4th Street',
        lat: 40.7253199,
        lng: -73.9403011,
        alt: 25,
      },
      {
        id: 2,
        type: 'install',
        date: new Date('2020-10-01T14:00:00.000Z'),
        notes: null,
        request_id: 1811,
        member_id: 1669,
        building_id: 1673,
        node_id: null,
        acuity_id: 472552066,
        slack_ts: null,
        address: '987 6th Ave',
        lat: 40.7253234,
        lng: -73.9404138,
        alt: 21,
      },
    ]);

    expect(await getAppointmentsKML()).toMatchSnapshot();
  })
});
