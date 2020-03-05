import { installMessage } from "../slack";
import fetch from "node-fetch";

export async function acuityWebhook(body) {
	console.log(body);
	const { action, id, calendarID } = body;

	const appointmentRes = await fetch(
		`https://acuityscheduling.com/api/v1/appointments/${id}`,
		{
			headers: {
				Authorization: `Basic ${new Buffer(
					`${process.env.ACUITY_USER_ID}:${process.env.ACUITY_API_KEY}`
				).toString("base64")}`
			}
		}
	);

	const appointment = await appointmentRes.json();

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

async function asyncAcuityRequest() {
	acuity.request("/appointments", function(err, res, appointments) {
		if (err) reject(err);
		resolve(appointments);
	});
}
