import {
	requestMessage,
	panoMessage,
	installMessage,
	rescheduleMessage
} from '.';

describe('requestMessage', () => {
	describe('if the member has roof access', () => {
		it('sends a message to the join requests channel', async () => {
			const slackClient = mockSlackClient();
			slackClient.getChannel.mockResolvedValue({ name: "join-requests-test", id: 1 });

			const request = { id: 4321, roof_access: true };
			const building = {
				address: '123 4th Street',
				alt: 300,
				lat: 32.1234542,
				lng: 188.029342,
				bin: 'F4SF0J32',
			};
			const visibleNodes = [
				{ devices: [ { type: { name: "LBE" } } ], id: 5544 },
				{ devices: [ { type: { name: "OmniTik" } } ], id: 312 },
			]

			await requestMessage(slackClient, request, building, visibleNodes);

			expect(slackClient.getChannel).toHaveBeenCalledWith("join-requests-test");
			expect(slackClient.postMessage).toHaveBeenCalled();
			const { channel, text, blocks } = slackClient.postMessage.mock.calls[0][0];
			expect(channel).toBe(1);
			expect(text).toBe('123 4th Street · 98m · Roof access · LoS to nodes 5544, 312');
			const lines = blocks[0].text.text.split('\n');
			expect(lines).toHaveLength(3);
			expect(lines[0]).toBe("*<https://www.nycmesh.net/map/nodes/4321|123 4th Street>*");
			expect(lines[1]).toBe("98m · Roof access · LoS to nodes 5544, 312");
			expect(lines[2]).toBe("<https://earth.google.com/web/search/123+4th+Street/@32.1234542,188.029342,300a,300d,40y,0.6h,65t,0r|Earth →>\t<https://los.nycmesh.net/search?address=123%204th%20Street&bin=F4SF0J32&lat=32.1234542&lng=188.029342|LoS →>\t<https://support.nycmesh.net/scp/tickets.php?a=search&query=4321|Ticket →>");
		});
	});

	describe('if the member does not have roof access', () => {
		it('sends a message to the join requests channel', async () => {
			const slackClient = mockSlackClient();
			slackClient.getChannel.mockResolvedValue({ name: "join-requests-test", id: 1 });

			const request = { roof_access: false };
			const building = { address: '123 4th Street' };

			await requestMessage(slackClient, request, building, []);

			expect(slackClient.postMessage).toHaveBeenCalled();
			const { text } = slackClient.postMessage.mock.calls[0][0];
			expect(text).toContain('No roof access');
		});
	});

	describe('if there are no visible nodes', () => {
		it('sends a message to the join requests channel', async () => {
			const slackClient = mockSlackClient();
			slackClient.getChannel.mockResolvedValue({ name: "join-requests-test", id: 1 });

			const building = { address: '123 4th Street' };

			await requestMessage(slackClient, {}, building, []);

			expect(slackClient.postMessage).toHaveBeenCalled();
			const { text } = slackClient.postMessage.mock.calls[0][0];
			expect(text).toContain('No LoS');
		});
	});

	describe('if visible nodes is null', () => {
		it('sends a message to the join requests channel', async () => {
			const slackClient = mockSlackClient();
			slackClient.getChannel.mockResolvedValue({ name: "join-requests-test", id: 1 });

			const building = { address: '123 4th Street' };

			await requestMessage(slackClient, {}, building, null);

			expect(slackClient.postMessage).toHaveBeenCalled();
			const { text } = slackClient.postMessage.mock.calls[0][0];
			expect(text).toContain('LoS Failed');
		});
	});

	describe("if the channel is not found", () => {
		it("does not send a message", async () => {
			const slackClient = mockSlackClient();
			slackClient.getChannel.mockResolvedValue(null);

			await requestMessage(slackClient, {}, { address: "" }, []);

			expect(slackClient.postMessage).not.toHaveBeenCalled();
		});
	});
});

describe('panoMessage', () => {
	it('sends a message to the panoramas channel', async () => {
		const slackClient = mockSlackClient();
		slackClient.getChannel.mockResolvedValue({ name: "panoramas-test", id: 2 });

		const url = 'https://example.com';
		const nodeID = 1;

		await panoMessage(slackClient, { url, node_id: nodeID });

		expect(slackClient.getChannel).toHaveBeenCalledWith("panoramas-test");
		expect(slackClient.postMessage).toHaveBeenCalled();
		const { channel, text, blocks } = slackClient.postMessage.mock.calls[0][0];
		expect(channel).toBe(2);
		expect(text).toBe('New pano for 1!');
		expect(blocks[0].image_url).toBe('https://example.com');
	});
});

describe('installMessage', () => {
	it('sends a message to the install channel', async () => {
		const slackClient = mockSlackClient();
		slackClient.getChannel.mockResolvedValue({ name: "install-team-test", id: 3 });

		const appointment = {
			building: {
				address: '567 8th Street',
				alt: 250,
				lat: 91.423,
				lng: 11.121,
				bin: '8FS3',
			},
			member: {
				name: 'First Last',
				phone: '800-555-5555',
				email: 'first@last.com',
			},
			date: 946713600000,
			request_id: 6678,
			node_id: 6678,
			type: "install",
			notes: "Omni only",
		};

		await installMessage(slackClient, appointment);

		expect(slackClient.getChannel).toHaveBeenCalledWith("install-team-test");
		const { channel, blocks, text } = slackClient.postMessage.mock.calls[0][0];
		expect(channel).toBe(3);
		expect(blocks).toHaveLength(4);
		expect(blocks[0].text.text).toBe("New install:\n*567 8th Street*\nSaturday, Jan 1 8:00 AM");
		expect(blocks[1].text.text).toBe("*Name:*\tFirst Last\n*Phone:*\t<tel:800-555-5555|800-555-5555>\n*Email:*\tfirst@last.com\n*Node:*\t<https://www.nycmesh.net/map/nodes/6678|6678>\n*Notes:*\tOmni only\n");
		expect(blocks[2].text.text).toBe("<https://earth.google.com/web/search/567+8th+Street/@91.423,11.121,250a,300d,40y,0.6h,65t,0r|Earth →>\t<https://los.nycmesh.net/search?address=567%208th%20Street&bin=8FS3&lat=91.423&lng=11.121|LoS →>\t<https://support.nycmesh.net/scp/tickets.php?a=search&query=6678|Ticket →>");
		expect(blocks[3].text.text).toBe("Are you available? Thread here");
		expect(text).toBe("New install:\n567 8th Street\nSaturday, Jan 1 8:00 AM");
	});
});

describe("rescheduleMessage", () => {
	it("updates the original message in the install channel", async () => {
		const slackClient = mockSlackClient();
		slackClient.getChannel.mockResolvedValue({ name: "install-team-test", id: 3 });

		const appointment = {
			building: { address: '567 8th Street' },
			member: {},
			date: 946713600000,
			type: "survey",
		};

		await rescheduleMessage(slackClient, appointment, 2394587345);

		expect(slackClient.getChannel).toHaveBeenCalledWith("install-team-test");
		expect(slackClient.update).toHaveBeenCalled();
		const { channel, ts, blocks, text } = slackClient.update.mock.calls[0][0];
		expect(channel).toBe(3);
		expect(ts).toBe(2394587345);
		expect(blocks).toHaveLength(4);
		expect(text).toBe("New survey:\n567 8th Street\nSaturday, Jan 1 8:00 AM");
	});

	it("posts a rescheduling message in a thread on the original message", async () => {
		const slackClient = mockSlackClient();
		slackClient.getChannel.mockResolvedValue({ name: "install-team-test", id: 3 });

		const appointment = {
			building: { address: '567 8th Street' },
			member: {},
			date: 946713600000,
		};

		await rescheduleMessage(slackClient, appointment, 2394587345);

		expect(slackClient.postMessage).toHaveBeenCalled();
		const { channel, thread_ts, reply_broadcast, text } = slackClient.postMessage.mock.calls[0][0];
		expect(channel).toBe(3);
		expect(thread_ts).toBe(2394587345);
		expect(reply_broadcast).toBe(true);
		expect(text).toBe("Rescheduled to Saturday, Jan 1 8:00 AM");
	});
});

function mockSlackClient() {
	return {
		getChannel: jest.fn(),
		postMessage: jest.fn(),
		update: jest.fn(),
	}
}
