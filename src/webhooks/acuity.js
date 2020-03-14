import { installMessage } from "../slack";
import fetch from "node-fetch";
import { getAppointment, createAppointment } from "../db/appointments";
import { getRequest } from "../db/requests";

export async function acuityWebhook(body) {
	const { action, id } = body;

	const acuityAppointment = await getAcuityAppointment(id);

	console.log(acuityAppointment);

	const { values } = acuityAppointment.forms[0];
	const [requestIdValue] = values.filter(v => v.name === "Node Number");
	const [notesValue] = values.filter(v => v.name === "Notes");
	const requestId = parseInt(requestIdValue.value);
	const notes = String(notesValue.value);

	const request = await getRequest(requestId);

	if (action === "scheduled") {
		// Sanitize type
		const typeMap = {
			Install: "install",
			Support: "support",
			"Site survey": "survey"
		};

		// Create appointment in db
		const newApointment = await createAppointment({
			type: typeMap[acuityAppointment.type],
			date: acuityAppointment.date,
			notes,
			request_id: request.id,
			member_id: request.member.id,
			building_id: request.building.id,
			acuity_id: id
		});

		// Send message to slack
		// Save slack message id to db
	} else if (action === "rescheduled") {
		// Fetch slack message id from db
		// Update slack message
		// Post update to thread + channel
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
