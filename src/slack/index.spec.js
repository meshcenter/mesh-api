import { WebClient } from "@slack/web-api";
import { panoMessage } from '.';

const mockPostMessage = jest.fn('slack.chat.postMessage');
const mockUpdate = jest.fn('slack.chat.update');

jest.mock("@slack/web-api", () => {
	return {
		WebClient: jest.fn().mockImplementation(() => {
			return {
				chat: {
					postMessage: mockPostMessage,
					update: mockUpdate,
				},
				conversations: {
					list: () => {
						return [
							{ name: 'join-requests-test', id: 4 },
							{ name: 'panoramas-test', id: 5 },
							{ name: 'install-team-test', id: 6 },
						];
					},
				},
			}
		}),
	};
});

beforeEach(() => {
	mockPostMessage.mockClear();
	mockUpdate.mockClear();
	mockWebClient.mockClear();
});

describe('panoMessage', () => {
	it('sends a message to the panoramas channel', () => {
		const url = 'https://example.com';
		const nodeID = 1;

		panoMessage({ url, node_id: nodeID });

		expect(mockPostMessage).toHaveBeenCalledTimes(1);
		const arg = mockPostMessage.mock.calls[0][0];
		expect(arg.channel).toBe(5)
	})
});
