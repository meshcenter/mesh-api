import { format } from "date-fns";

const requestChannel = "join-requests-test";
const panoChannel = "panoramas-test";
const installChannel = "install-team-test";

const dateFmtString = "EEEE, MMM d h:mm aa";

export async function requestMessage(client, request, building, visibleNodes) {
	return sendMessage(
		client,
		requestChannel,
		requestMessageContent(request, building, visibleNodes)
	);
}

export async function panoMessage(client, pano) {
	return sendMessage(client, panoChannel, panoMessageContent(pano));
}

export async function installMessage(client, appointment) {
	return sendMessage(
		client,
		installChannel,
		installMessageContent(appointment)
	);
}

export async function rescheduleMessage(client, appointment, slackTS) {
	const channel = await client.getChannel(installChannel);
	if (!channel) {
		// console.log(`#${channelName} not found`);
		return;
	}

	const { text, blocks } = installMessageContent(appointment);
	const formattedDate = format(appointment.date, dateFmtString);

	await client.update({
		channel: channel.id,
		ts: slackTS,
		text,
		blocks,
	});

	return client.postMessage({
		channel: channel.id,
		thread_ts: slackTS,
		reply_broadcast: true,
		text: `Rescheduled to ${formattedDate}`,
	});
}

async function sendMessage(client, channelName, messageContent) {
	const channel = await client.getChannel(channelName);
	if (!channel) {
		// console.log(`#${channelName} not found`);
		return;
	}

	const { text, blocks } = messageContent;

	return client.postMessage({
		channel: channel.id,
		text,
		blocks,
	});
}

function requestMessageContent(request, building, visibleNodes) {
	const { id, roof_access } = request;
	const { address, alt } = building;
	const altMeters = Math.round(alt * 0.328);
	const losString = getLoSString(visibleNodes);
	const roofString = roof_access ? "Roof access" : "No roof access";
	const mapURL = getMapURL(id);
	const earthURL = getEarthURL(building);
	const losURL = getLosURL(building);
	const ticketURL = getTicketURL(id);

	const title = `*<${mapURL}|${address}>*`;
	const info = `${altMeters}m · ${roofString} · ${losString}`;
	const links = `<${earthURL}|Earth →>\t<${losURL}|LoS →>\t<${ticketURL}|Ticket →>`;
	const text = `${title}\n${info}\n${links}`;
	const fallbackText = `${address} · ${info}`;

	return {
		blocks: [markdownSection(text)],
		text: fallbackText,
	};
}

function panoMessageContent(pano) {
	const blocks = [
		{
			type: "image",
			title: {
				type: "plain_text",
				text: "Panorama 1",
			},
			image_url: pano.url,
			alt_text: "Panorama 1",
		},
		{
			type: "actions",
			elements: [
				{
					type: "button",
					text: {
						type: "plain_text",
						emoji: true,
						text: "Schedule Install",
					},
					style: "primary",
					value: "click_me_123",
				},
				{
					type: "button",
					text: {
						type: "plain_text",
						emoji: true,
						text: "No Line of Sight",
					},
					style: "danger",
					value: "click_me_123",
				},
			],
		},
	];

	const fallbackText = `New pano for ${pano.node_id}!`;

	return {
		blocks,
		text: fallbackText,
	};
}

function installMessageContent(appointment) {
	const { building, member } = appointment;
	const formattedDate = format(appointment.date, dateFmtString);
	const mapURL = getMapURL(appointment.request_id);
	const earthURL = getEarthURL(building);
	const losURL = getLosURL(building);
	const ticketURL = getTicketURL(appointment.request_id);

	const introText = `New ${appointment.type}:\n*${building.address}*\n${formattedDate}`;
	const nameText = `*Name:*\t${member.name}\n`;
	const phoneText = `*Phone:*\t<tel:${member.phone}|${member.phone}>\n`;
	const emailText = `*Email:*\t${member.email}\n`;
	const nodeText = `*Node:*\t<${mapURL}|${appointment.node_id}>\n`;
	const notesText = appointment.notes
		? `*Notes:*\t${appointment.notes}\n`
		: "";
	const infoText = `${nameText}${phoneText}${emailText}${nodeText}${notesText}`;
	const linksText = `<${earthURL}|Earth →>\t<${losURL}|LoS →>\t<${ticketURL}|Ticket →>`;

	const fallbackText = `New ${appointment.type}:\n${building.address}\n${formattedDate}`;

	const blocks = [
		markdownSection(introText),
		markdownSection(infoText),
		markdownSection(linksText),
		markdownSection("Are you available? Thread here"),
	];

	return {
		blocks,
		text: fallbackText,
	};
}

function markdownSection(text) {
	return {
		type: "section",
		text: {
			type: "mrkdwn",
			text,
		},
	};
}

function getLoSString(visibleNodes) {
	if (!visibleNodes) {
		return "LoS Failed";
	}

	if (!visibleNodes.length) {
		return "No LoS";
	}

	const isKnownDevice = (device) => device.type.name !== "Unknown";
	const hasDevice = (node) => node.devices.filter(isKnownDevice).length;
	const toIdentifier = (node) => node.name || node.id;
	const visible = visibleNodes.filter(hasDevice).map(toIdentifier).join(", ");
	const nodesString = visible.length !== 1 ? "nodes" : "node";

	return `LoS to ${nodesString} ${visible}`;
}

function getMapURL(id) {
	return `https://www.nycmesh.net/map/nodes/${id}`;
}

function getEarthURL(building) {
	const { address, lat, lng, alt } = building;
	const earthAddress = address.replace(/,/g, "").replace(/ /g, "+");
	return `https://earth.google.com/web/search/${earthAddress}/@${lat},${lng},${alt}a,300d,40y,0.6h,65t,0r`;
}

function getLosURL(building) {
	const { address, bin, lat, lng } = building;
	const URIAddress = encodeURIComponent(address);
	return `https://los.nycmesh.net/search?address=${URIAddress}&bin=${bin}&lat=${lat}&lng=${lng}`;
}

function getTicketURL(id) {
	return `https://support.nycmesh.net/scp/tickets.php?a=search&query=${id}`;
}
