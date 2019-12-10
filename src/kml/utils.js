const BASE_URL =
    process.env.NODE_ENV === "production"
        ? "https://api.nycmesh.net"
        : "http://localhost:9000";

export function networkLink(name, endpoint) {
    return `<NetworkLink>
    <name>${name}</name>
    <Link>
        <href>${BASE_URL}${endpoint}</href>
    </Link>
</NetworkLink>`;
}

export function kml(document) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
    <Document>
        ${document}
    </Document>
</kml>`;
}

export function data(name, value) {
    return `<Data name="${name}">
    <value>${value}</value>
</Data>`;
}

export function panoData(panorama) {
    const img = `<img src="${panorama.url}" style="max-width: 32rem;" />`;
    return data("Pano", img);
}

export function iconStyle(id, scale, icon) {
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

export function lineStyle(id, color, width) {
    return `<Style id="${id}">
    <LineStyle>
        <color>${color}</color>
        <width>${width}</width>
    </LineStyle>
    <PolyStyle>
        <color>00000000</color>
    </PolyStyle>
</Style>`;
}
