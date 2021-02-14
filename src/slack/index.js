import { format } from "date-fns";

const dateFmtString = "EEEE, MMM d h:mm aa";

export async function requestMessage(
  client,
  request,
  building,
  visibleNodes,
  buildingNodes
) {
  return sendMessage(
    client,
    process.env.SLACK_REQUEST_CHANNEL,
    requestMessageContent(request, building, visibleNodes, buildingNodes)
  );
}

export async function panoMessage(client, pano, request) {
  const messageContent = panoMessageContent(pano, request);
  if (request.slack_ts) {
    const channel = await client.getChannel(process.env.SLACK_REQUEST_CHANNEL);
    return client.postMessage({
      channel: channel.id,
      thread_ts: request.slack_ts,
      reply_broadcast: true,
      ...messageContent,
    });
  } else {
    return sendMessage(
      client,
      process.env.SLACK_REQUEST_CHANNEL,
      messageContent
    );
  }
}

export async function installMessage(client, appointment) {
  const slackRes = await sendMessage(
    client,
    process.env.SLACK_INSTALL_CHANNEL,
    installMessageContent(appointment)
  );

  // Reply in thread
  const channel = await client.getChannel(process.env.SLACK_INSTALL_CHANNEL);
  await client.postMessage({
    channel: channel.id,
    thread_ts: slackRes.ts,
    ...installMessageReplyContent(appointment),
  });

  return slackRes;
}

export async function rescheduleMessage(client, appointment, slackTS) {
  const channel = await client.getChannel(process.env.SLACK_INSTALL_CHANNEL);
  if (!channel) {
    console.log(`#${channelName} not found`);
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
    console.log(`#${channelName} not found`);
    return;
  }

  const { text, blocks } = messageContent;

  return client.postMessage({
    channel: channel.id,
    text,
    blocks,
  });
}

function requestMessageContent(request, building, visibleNodes, buildingNodes) {
  const { id, roof_access } = request;
  const { address, alt } = building;

  const dashboardURL = getDashboardURL("requests", id);
  const titleText = address;
  const title = `*<${dashboardURL}|${titleText}>*`;

  const altString = alt
    ? `${Math.round(alt * 0.328)}m · `
    : "Building not found · ";
  const roofString = roof_access ? "Roof access · " : "No roof access · ";
  const losString = getLoSString(visibleNodes);
  const info = `${altString}${roofString}${losString}`;

  const text = `${title}\n${info}`;
  const fallbackText = address;

  const blocks = [markdownSection(text)];

  if (buildingNodes.length) {
    blocks.push(contextSection("✅ Node in building!"));
  }

  return {
    blocks,
    text: fallbackText,
  };
}

function panoMessageContent(pano, request) {
  const imageText = request.slack_ts
    ? "Panorama"
    : `Request ${request.id} - ${request.building.address}`;
  const blocks = [
    {
      type: "image",
      title: {
        type: "plain_text",
        text: imageText,
      },
      image_url: encodeURI(pano.url),
      alt_text: imageText,
    },
  ];

  const text = `New pano for request ${pano.request_id}!`;
  return {
    blocks,
    text,
  };
}

function installMessageContent(appointment) {
  const { building, member, request } = appointment;
  const formattedDate = format(appointment.date, dateFmtString);
  const fallbackText = `${request.id} - ${member.name} - ${appointment.type}\n${formattedDate}\n${building.address}`;
  const line1 = `<https://dashboard.nycmesh.net/appointments/${appointment.id}|*${request.id} - ${member.name} - ${appointment.type}*>`;
  const blocks = [
    markdownSection(`${line1}\n${formattedDate}\n${building.address}`),
  ];

  return {
    blocks,
    text: fallbackText,
  };
}

function installMessageReplyContent(appointment) {
  const { member } = appointment;
  // const introText = `New ${appointment.type}:\n*${building.address}*\n${formattedDate}`;
  const nameText = `*Name:*\t${member.name}\n`;
  const phoneText = `*Phone:*\t<tel:${member.phone}|${member.phone}>\n`;
  const emailText = `*Email:*\t${member.email}\n`;
  const notesText = appointment.notes ? `*Notes:*\t${appointment.notes}\n` : "";

  const fallbackText = `Name: ${member.name}\nPhone: ${member.phone}\nEmail: ${member.email}\nNotes: ${appointment.notes}`;
  const blocks = [
    markdownSection(`${nameText}${phoneText}${emailText}${notesText}`),
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

function contextSection(text) {
  return {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text,
      },
    ],
  };
}

function getLoSString(visibleNodes) {
  if (!visibleNodes) {
    return "LoS search failed";
  }

  if (!visibleNodes.length) {
    return "No LoS";
  }

  const isKnownDevice = (device) => device.type.name !== "Unknown";
  const hasDevice = (node) => node.devices.filter(isKnownDevice).length;
  const toIdentifier = (node) => node.name || node.id;
  return visibleNodes.filter(hasDevice).map(toIdentifier).join(", ");
}

function getDashboardURL(type, id) {
  return `https://dashboard.nycmesh.net/map/${type}/${id}`;
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
