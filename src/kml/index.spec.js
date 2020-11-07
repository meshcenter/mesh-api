import { getKML } from ".";

describe("getKML", () => {
  it("renders KML for appointments, LoS, nodes, and requests", () => {
    expect(getKML()).toMatchSnapshot();
  });
});
