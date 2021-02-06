import { format } from "date-fns";
import { performQuery } from "../db";
import { iconStyle, data, kml } from "./utils";

export async function getAppointmentsKML(params) {
    const appointments = await getAppointments();
    const appointmentsKML = appointments.map(appointmentKML);

    const elements = [
        iconStyle("install", 0.75, "https://i.imgur.com/4baif2L.png"),
        iconStyle("support", 0.75, "https://i.imgur.com/qVRzBlS.png"),
        iconStyle("survey", 0.75, "https://i.imgur.com/4baif2L.png"),
        appointmentsKML,
    ];

    return kml(elements);
}

function appointmentKML(appointment) {
    const capitalizedType = `${appointment.type
        .charAt(0)
        .toUpperCase()}${appointment.type.slice(1)}`;
    const dateString = format(appointment.date, "eee, MMM d");
    const hourString = format(appointment.date, "h:mm a", {
        timeZone: "America/New_York",
    });
    const coordinates = `${appointment.lng},${appointment.lat},${appointment.alt}`;
    const ticketURL = `<a href="https://support.nycmesh.net/scp/tickets.php?a=search&amp;query=${appointment.request_id}" style="margin-right: 1rem;">Ticket →</a>`;
    return `
<Placemark>
    <name>${capitalizedType} - ${dateString}</name>
    <ExtendedData>
        ${data("Type", capitalizedType)}
        ${data("Date", dateString)}
        ${data("Hour", hourString)}
        ${data("Links", ticketURL)}
    </ExtendedData>
    <Point>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>${coordinates}</coordinates>
    </Point>
    <styleUrl>#${appointment.type}</styleUrl>
</Placemark>`;
}

const appointmentsQuery = `SELECT
    appointments.*,
    buildings.address,
    buildings.lat,
    buildings.lng,
    buildings.alt
FROM
    appointments
    JOIN buildings ON buildings.id = appointments.building_id
WHERE
    appointments.date > now() - INTERVAL '6 HOURS'
ORDER BY
    date`;

async function getAppointments() {
    return performQuery(appointmentsQuery);
}
