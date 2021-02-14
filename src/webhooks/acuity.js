import fetch from "node-fetch";
import {
  getAppointment,
  getAppointmentByAcuityId,
  createAppointment,
  updateAppointment,
} from "../db/appointments";
import { getRequest } from "../db/requests";
import { installMessage } from "../slack";

export async function acuityWebhook(body, slackClient) {
  const { action, id } = body;

  const acuityAppointment = await getAcuityAppointment(id);

  if (!acuityAppointment) {
    throw new Error(`Acuity appointment ${id} not found`);
  }

  const { values } = acuityAppointment.forms[0];
  const [requestIdValue] = values.filter((v) => v.name === "Node Number");
  const [notesValue] = values.filter((v) => v.name === "Notes");
  const requestId = parseInt(requestIdValue.value);
  const notes = String(notesValue.value);

  const request = await getRequest(requestId);

  if (action === "scheduled") {
    const sanitizedType = sanitizeType(acuityAppointment.type);

    // Create appointment in db
    const newApointment = await createAppointment({
      type: sanitizedType,
      date: acuityAppointment.date,
      notes,
      request_id: request.id,
      member_id: request.member.id,
      building_id: request.building.id,
      acuity_id: id,
    });

    const fullAppointment = await getAppointment(newApointment.id);

    // Send message to slack
    const slackRes = await installMessage(slackClient, fullAppointment);

    // Save slack message ts to db
    await updateAppointment({ ...fullAppointment, slack_ts: slackRes.ts });
  } else if (action === "rescheduled") {
    const appointment = await getAppointmentByAcuityId(id);
    await updateAppointment({
      ...appointment,
      date: acuityAppointment.date,
      notes,
    });
    const updatedAppointment = await getAppointmentByAcuityId(id);

    // Update slack message, post to thread + channel
    await rescheduleMessage(
      slackClient,
      updatedAppointment,
      updatedAppointment.slack_ts
    );
  } else if (action === "canceled") {
    // Fetch slack message id from db
    // Update slack message
    // Post update to thread + channel
  } else if (action === "changed") {
    // Fetch slack message id from db
    // Update slack message
    // Post update to thread + channel
  }
}

async function getAcuityAppointment(id) {
  const URL = `https://acuityscheduling.com/api/v1/appointments/${id}`;
  const userPass = `${process.env.ACUITY_USER_ID}:${process.env.ACUITY_API_KEY}`;
  const passBuffer = Buffer.from(userPass);
  const pass64 = passBuffer.toString("base64");
  const auth = `Basic ${pass64}`;
  const headers = { Authorization: auth };
  const res = await fetch(URL, { headers });
  return res.json();
}

function sanitizeType(type) {
  const typeMap = {
    Install: "install",
    Support: "support",
    "Site survey": "survey",
  };
  return typeMap[type];
}
