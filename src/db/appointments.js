import { performQuery } from ".";

const getAppointmentQuery = `SELECT
	*
FROM
	appointments
WHERE
	id = $1`;

const createAppointmentQuery = `INSERT INTO appointments (type, date, notes, member_id, building_id, request_id, acuity_id)
	VALUES($1, $2, $3, $4, $5, $6, $7)
RETURNING
	*`;

export async function getAppointment(id) {
	return performQuery(getAppointmentQuery, [id]);
}

export async function createAppointment(appointment) {
	return performQuery(createAppointmentQuery, [
		appointment.type,
		appointment.date,
		appointment.notes,
		appointment.member_id,
		appointment.building_id,
		appointment.request_id,
		appointment.acuity_id
	]);
}
