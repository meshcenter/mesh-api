import { performQuery } from ".";
import { getBuilding } from "./buildings";
import { createNode } from "./nodes";

const queries = {
  getAppointment: `SELECT
  appointments.*,
  to_json(buildings) AS building,
  to_json(members) AS member,
  to_json(nodes) AS node,
  COALESCE(
    (
      SELECT
        jsonb_build_object(
          'id', requests.id,
          'status', requests.status,
          'apartment', requests.apartment,
          'date', requests.date,
          'roof_access', requests.roof_access,
          'member', to_json(members.*)
        )
      FROM
        requests
      JOIN
        members ON members.id = requests.member_id
      WHERE
        requests.id = appointments.request_id
    ),
    '[]'
  ) AS request
FROM
  appointments
  LEFT JOIN buildings ON appointments.building_id = buildings.id
  LEFT JOIN members ON appointments.member_id = members.id
  LEFT JOIN nodes ON appointments.node_id = nodes.id
WHERE
  appointments.id = $1
GROUP BY
  appointments.id,
  buildings.id,
  members.id,
  nodes.id`,

  authorizedGetAppointment: `SELECT 
  appointments.*,
  to_json(buildings) AS building,
  to_json(requests) AS request,
  to_json(members) AS member
FROM
  appointments
JOIN
  buildings ON buildings.id = appointments.building_id
JOIN
  requests ON requests.id = appointments.request_id
JOIN
  members ON members.id = appointments.member_id
ORDER BY
  appointments.date`,

  getAppointmentByAcuityId:
    "SELECT id FROM appointments WHERE appointments.acuity_id = $1",

  createAppointment: `INSERT INTO appointments (type, date, notes, member_id, building_id, request_id, node_id, acuity_id)
  VALUES($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING
  *`,

  updateAppointment: `UPDATE
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
  *`,
};

export async function getAppointment(id) {
  const [appointment] = await performQuery(queries.getAppointment, [id]);
  return appointment;
}

export async function getAppointments() {
  const appointments = await performQuery(queries.authorizedGetAppointment);
  return appointments;
}

export async function getAppointmentByAcuityId(acuity_id) {
  const [idAppointment] = await performQuery(queries.getAppointmentByAcuityId, [
    acuity_id,
  ]);
  return authorizedGetAppointment(idAppointment.id);
}

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

  const [newAppointment] = await performQuery(queries.createAppointment, [
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

export async function updateAppointment(appointment) {
  const [updatedAppointment] = await performQuery(queries.updateAppointment, [
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
