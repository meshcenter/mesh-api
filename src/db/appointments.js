import { performQuery } from ".";
import { getBuilding } from "./buildings";
import { createNode } from "./nodes";

const getAppointmentsQuery = `SELECT
	appointments.*,
	to_json(buildings) AS building
FROM
	appointments
	LEFT JOIN buildings ON appointments.building_id = buildings.id
GROUP BY
	appointments.id,
	buildings.id`;

export async function getAppointments() {
  const appointments = await performQuery(getAppointmentsQuery);
  return appointments;
}

const getAppointmentQuery = `SELECT
	appointments.*,
	to_json(buildings) AS building,
	to_json(members) AS member
FROM
	appointments
	LEFT JOIN buildings ON appointments.building_id = buildings.id
	LEFT JOIN members ON appointments.member_id = members.id
WHERE
	appointments.id = $1
GROUP BY
	appointments.id,
	buildings.id,
	members.id`;

export async function getAppointment(id) {
  const [appointment] = await performQuery(getAppointmentQuery, [id]);
  return appointment;
}

export async function getAppointmentByAcuityId(acuity_id) {
  const [
    idAppointment,
  ] = await performQuery(
    "SELECT id FROM appointments WHERE appointments.acuity_id = $1",
    [acuity_id]
  );
  return getAppointment(idAppointment.id);
}

const createAppointmentQuery = `INSERT INTO appointments (type, date, notes, member_id, building_id, request_id, node_id, acuity_id)
	VALUES($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING
	*`;

export async function createAppointment(appointment) {
  // TODO: Allocate node if none in building
  const building = await getBuilding(appointment.building_id);
  if (!building.nodes.length) {
    const node = await createNode({
      lat: building.lat,
      lng: building.lng,
      alt: building.alt,
      status: "potential",
      building_id: building.id,
      member_id: appointment.member_id,
    });
    appointment.node_id = node.id;
  } else {
    const [buildingNode] = building.nodes;
    appointment.node_id = buildingNode.id;
  }

  const [newAppointment] = await performQuery(createAppointmentQuery, [
    appointment.type,
    appointment.date,
    appointment.notes,
    appointment.member_id,
    appointment.building_id,
    appointment.request_id,
    appointment.node_id,
    appointment.acuity_id,
  ]);
  return newAppointment;
}

const updateAppointmentQuery = `UPDATE
	appointments
SET
	type = $2,
	date = $3,
	notes = $4,
	member_id = $5,
	building_id = $6,
	request_id = $7,
	acuity_id = $8,
	slack_ts = $9
WHERE
	id = $1
RETURNING
	*`;

export async function updateAppointment(appointment) {
  const [updatedAppointment] = await performQuery(updateAppointmentQuery, [
    appointment.id,
    appointment.type,
    appointment.date,
    appointment.notes,
    appointment.member_id,
    appointment.building_id,
    appointment.request_id,
    appointment.acuity_id,
    appointment.slack_ts,
  ]);
  return updatedAppointment;
}
