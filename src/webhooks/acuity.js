import { installMessage } from "../slack";
import fetch from "node-fetch";

export async function acuityWebhook(body) {
	const { action, id, calendarID } = body;

	const appointment = await getAppointment(id);

	if (action === "scheduled") {
		// Save appointment to db
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

async function getAppointment(id) {
	const URL = `https://acuityscheduling.com/api/v1/appointments/${id}`;
	const userPass = `${process.env.ACUITY_USER_ID}:${process.env.ACUITY_API_KEY}`;
	const auth = `Basic ${new Buffer(userPass).toString("base64")}`;
	const headers = { Authorization: auth };
	const res = await fetch(URL, { headers });
	return res.json();
}
