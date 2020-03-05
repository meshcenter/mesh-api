import fetch from "node-fetch";

// TODO: Simplify
export async function requestMessage(request, building, member, visibleNodes) {
	const { id, roof_access } = request;
	const { address, lat, lng, alt, bin } = building;
	const altMeters = Math.round(alt * 0.328);

	const notUnknown = device => device.type.name !== "Unknown";
	const hasDevice = node => node.devices.filter(notUnknown).length;
	const nodeNames = (visibleNodes || [])
		.filter(hasDevice)
		.map(node => node.name || node.id)
		.join(", ");

	const losString = visibleNodes
		? visibleNodes.length
			? nodeNames
			: "No LoS"
		: "LoS Failed";

	const mapURL = `https://www.nycmesh.net/map/nodes/${id}`;
	const roofString = roof_access ? "Roof access" : "No roof access";
	const earthAddress = address.replace(/,/g, "").replace(/ /g, "+");
	const earthURL = `https://earth.google.com/web/search/${earthAddress}/@${lat},${lng},${alt}a,300d,40y,0.6h,65t,0r`;
	const uriAddress = encodeURIComponent(address);
	const losURL = `https://los.nycmesh.net/search?address=${uriAddress}&bin=${bin}&lat=${lat}&lng=${lng}`;
	const ticketURL = `https://support.nycmesh.net/scp/tickets.php?a=search&query=${id}`;

	const title = `*<${mapURL}|${address}>*`;
	const info = `${altMeters}m · ${roofString} · ${losString}`;
	const links = `<${earthURL}|Earth →>\t<${losURL}|LoS →>\t<${ticketURL}|Ticket →>`;
	const text = `${title}\n${info}\n${links}`;
	const fallbackText = `${address} · ${info}`;

	const blocks = [
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text
			}
		}
	];

	await sendMessage(blocks, fallbackText);
}

export async function panoMessage(pano) {
	const text = "New pano!";

	const blocks = [
		{
			type: "image",
			title: {
				type: "plain_text",
				text: "Panorama 1"
			},
			image_url: pano.url,
			alt_text: "Panorama 1"
		},
		{
			type: "actions",
			elements: [
				{
					type: "button",
					text: {
						type: "plain_text",
						emoji: true,
						text: "Schedule Install"
					},
					style: "primary",
					value: "click_me_123"
				},
				{
					type: "button",
					text: {
						type: "plain_text",
						emoji: true,
						text: "No Line of Sight"
					},
					style: "danger",
					value: "click_me_123"
				}
			]
		}
	];

	await sendMessage(blocks);
}

export async function installMessage(install) {
	const text = "New install!";

	const blocks = [
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text
			}
		}
	];

	await sendMessage(blocks);
}

async function sendMessage(blocks, text) {
	return fetch(process.env.SLACK_WEBHOOK_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			text,
			blocks
		})
	});
}
