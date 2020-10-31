import { panoMessage } from '.';

describe('panoMessage', () => {
	it('sends a message to the panoramas channel', async () => {
		const slackClient = mockSlackClient();
		slackClient.getChannel.mockResolvedValue({ name: "panoramas-test", id: 2 });

		const url = 'https://example.com';
		const nodeID = 1;

		await panoMessage(slackClient, { url, node_id: nodeID });

		expect(slackClient.postMessage).toHaveBeenCalled();
		const { channel, text, blocks } = slackClient.postMessage.mock.calls[0][0];
		expect(channel).toBe(2);
		expect(text).toBe('New pano for 1!');
		expect(blocks[0].image_url).toBe('https://example.com');
	})
});

function mockSlackClient() {
	return {
		getChannel: jest.fn(),
		postMessage: jest.fn(),
		update: jest.fn(),
	}
}
