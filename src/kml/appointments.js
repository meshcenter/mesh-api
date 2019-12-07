import { format } from "date-fns";
import { performQuery } from "../db";

export async function getAppointmentsKML(params) {
    const appointments = await getAppointments();
    const appointmentsKML = appointments.map(appointmentKML);

    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
    <Document>
        ${appointmentStyle("install", 0.75, "https://i.imgur.com/4baif2L.png")}
        ${appointmentStyle("support", 0.75, "https://i.imgur.com/qVRzBlS.png")}
        ${appointmentStyle("survey", 0.75, "https://i.imgur.com/4baif2L.png")}
        ${appointmentsKML}
    </Document>
</kml>`;

    return kml;
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
    appointments.date > now() - INTERVAL '12 HOURS'
ORDER BY
    date`;

async function getAppointments() {
    return performQuery(appointmentsQuery);
}

function appointmentKML(appointment) {
    const capitalizedType = `${appointment.type
        .charAt(0)
        .toUpperCase()}${appointment.type.slice(1)}`;
    const dateString = format(appointment.date, "eee, MMM d");
    const hourString = format(appointment.date, "h:mm a", {
        timeZone: "America/New_York"
    });
    return `
<Placemark>
    <name>${capitalizedType} - ${dateString}</name>
    <ExtendedData>
        <Data name="type">
            <value>${capitalizedType}</value>
        </Data>
        <Data name="date">
            <value>${dateString}</value>
        </Data>
        <Data name="time">
            <value>${hourString}</value>
        </Data>
    </ExtendedData>
    <Point>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>${appointment.lng},${appointment.lat},${appointment.alt}</coordinates>
    </Point>
    <styleUrl>#${appointment.type}</styleUrl>
</Placemark>`;
}

function appointmentStyle(id, scale, icon) {
    return `<Style id="${id}">
    <IconStyle>
        <scale>${scale}</scale> 
        <Icon>
            <href>${icon}</href>
        </Icon>
        <hotSpot xunits="fraction" yunits="fraction" x="0.5" y="0.5"></hotSpot>
    </IconStyle>
    <LabelStyle>
        <scale>0</scale>
    </LabelStyle>
</Style>`;
}
