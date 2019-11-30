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
    appointments.date > now()`;

async function getAppointments() {
    return performQuery(appointmentsQuery);
}

function appointmentKML(appointment) {
    return `
<Placemark>
    <name>${appointment.id}</name>
    <ExtendedData>
        <Data name="id">
            <value>${appointment.id}</value>
        </Data>
        <Data name="type">
            <value>${appointment.type}</value>
        </Data>
        <Data name="date">
            <value>${format(appointment.date, "eeee, MMMM d, yyyy")}</value>
        </Data>
        <Data name="time">
            <value>${format(appointment.date, "h:mm a")}</value>
        </Data>
    </ExtendedData>
    <Point>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>${appointment.lng},${appointment.lat},${
        appointment.alt
    }</coordinates>
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

