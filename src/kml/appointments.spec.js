import { performQuery } from "../db";
jest.mock("../db");
import { getAppointmentsKML } from "./appointments";

describe("getAppointmentsKML", () => {
  it("renders KML for the retrieved list of appointments", async () => {
    performQuery.mockResolvedValue([
      { type: "install", date: 946713600000, lat: 91.1442, lng: 133.2211, alt: 300, request_id: 1111 },
      { type: "install", date: 946704500000, lat: 91.1423, lng: 133.2910, alt: 100, request_id: 2222 },
      { type: "install", date: 946722200000, lat: 91.1401, lng: 133.2401, alt: 250, request_id: 3333 },
    ]);

    expect(await getAppointmentsKML()).toMatchSnapshot();
  })
});
