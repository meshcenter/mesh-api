import { createRequest } from "./requests";
import { end } from ".";

test("create request", async () => {
  const slackClient = mockSlackClient();
  slackClient.getChannel.mockResolvedValue({
    id: "channel_id",
  });
  slackClient.postMessage.mockResolvedValue({
    ts: "123",
  });

  const request = await createRequest(
    {
      name: "Test Name",
      email: "test@example.com",
      phone: "123456789",
      address: "375 Pearl Street, Manhattan, New York 10038",
      apartment: "Test Apt",
      roofAccess: true,
    },
    slackClient
  );

  expect(request).toHaveProperty("id");
  expect(request).toHaveProperty("status");
  expect(request).toHaveProperty("apartment");
  expect(request).toHaveProperty("roof_access");
  expect(request).toHaveProperty("date");
  expect(request).toHaveProperty("osticket_id");
  expect(request).toHaveProperty("member_id");
  expect(request).toHaveProperty("building_id");
  expect(request).toHaveProperty("slack_ts");

  await end();
});

function mockSlackClient() {
  return {
    getChannel: jest.fn(),
    postMessage: jest.fn(),
    update: jest.fn(),
  };
}
