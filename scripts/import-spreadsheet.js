require("dotenv").config();
const fetch = require("node-fetch");
const { isAfter } = require("date-fns");
const { insertBulk, performQuery } = require("./db");

importSpreadsheet().then(() => process.exit(0));

async function importSpreadsheet() {
	console.log("Fetching spreadsheet...");
	const spreadsheetRes = await fetch(process.env.SPREADSHEET_URL);
	const { nodes: rawNodes, links, sectors } = await spreadsheetRes.json();
	const nodes = rawNodes
		.filter(node => node.address)
		.map(node => ({
			...node,
			memberEmail: (node.memberEmail || "").toLowerCase().trim()
		}));

	console.log("Importing spreadsheet...");
	await importBuildings(nodes);
	await importMembers(nodes);
	await importNodes(nodes);
	await importJoinRequests(nodes);
	await importDevices(sectors);
	await importLinks(links);
	await importAppointments();
}

async function importBuildings(nodes) {
	const clusteredNodes = getClusteredNodes(nodes);
	return insertBulk(
		"buildings",
		["address", "lat", "lng", "alt", "notes", "bin"],
		clusteredNodes.filter(cluster => cluster[0].address),
		cluster => {
			const { id, address, coordinates, notes, bin } = cluster[0]; // TODO: Something better than first node
			const [lng, lat, alt] = coordinates;
			return [
				String(address).slice(0, 256),
				parseFloat(lat),
				parseFloat(lng),
				parseFloat(alt),
				notes ? String(notes) : null,
				bin
			];
		}
	);
}

async function importNodes(nodes) {
	const buildings = await performQuery("SELECT * FROM buildings");
	const buildingsByAddress = buildings.reduce((acc, cur) => {
		acc[cur.address] = cur;
		return acc;
	}, {});

	const buildingsByNodeAddress = {};
	const clusteredNodes = getClusteredNodes(nodes);
	clusteredNodes.forEach(cluster => {
		const firstNode = cluster[0];
		const clusterBuilding = buildingsByAddress[firstNode.address];
		cluster.forEach(node => {
			buildingsByNodeAddress[node.address] = clusterBuilding;
		});
	});

	const members = await performQuery("SELECT * FROM members");
	const membersMap = members.reduce((acc, cur) => {
		acc[cur.email] = cur;
		return acc;
	}, {});

	const actualNodes = nodes.filter(
		node =>
			node.status === "Installed" ||
			node.status === "Abandoned" ||
			node.status === "Unsubscribe"
	);
	const installedNodes = actualNodes.filter(node => node.installDate);
	const validNodes = installedNodes.filter(
		node => node.address && buildingsByNodeAddress[node.address]
	);
	const activeNodes = validNodes.filter(node => node.status === "Installed");

	let maxNodeId = 1;
	await insertBulk(
		"nodes",
		[
			"id",
			"lat",
			"lng",
			"alt",
			"status",
			"location",
			"name",
			"notes",
			"create_date",
			"abandon_date",
			"building_id",
			"member_id"
		],
		validNodes,
		node => {
			if (
				!node.memberEmail ||
				!membersMap[node.memberEmail.toLowerCase()]
			) {
				console.log("Node", node.id, "not found");
			}
			if (node.status !== "Installed" && !node.abandonDate) {
				console.log("Added abandon date to ", node.id);
				console.log(node.id, node.status);
				node.abandonDate = node.installDate;
			}
			maxNodeId = Math.max(maxNodeId, node.id);
			return [
				node.id,
				node.coordinates[1],
				node.coordinates[0],
				node.coordinates[2],
				node.status === "Installed" ? "active" : "dead",
				node.address,
				node.name,
				node.notes,
				new Date(node.installDate),
				node.abandonDate ? new Date(node.abandonDate) : null,
				buildingsByNodeAddress[node.address].id,
				membersMap[node.memberEmail.toLowerCase()].id
			];
		}
	);
	await performQuery(
		`ALTER SEQUENCE nodes_id_seq RESTART WITH ${maxNodeId + 1}`
	);
}

async function importDevices(devices) {
	const deviceTypeMap = devices.reduce((acc, cur) => {
		acc[cur.device] = {
			name: cur.device,
			range: cur.radius,
			width: cur.width
		};
		return acc;
	}, {});

	deviceTypeMap["Unknown"] = { name: "Unknown", range: 0, width: 0 };

	const deviceTypes = Object.values(deviceTypeMap);
	await insertBulk(
		"device_types",
		["name", "range", "width"],
		deviceTypes.filter(type => {
			if (!type.name || !type.range || !type.width) {
				console.log(`Invalid device type:`, type);
				// return false;
			}
			return true;
		}),
		type => [type.name, type.range, type.width]
	);

	const dbDeviceTypes = await performQuery("SELECT * FROM device_types");
	const dbDeviceTypeMap = dbDeviceTypes.reduce((acc, cur) => {
		acc[cur.name] = cur;
		return acc;
	}, {});

	// Add devices for nodes with no devices
	const devicesMap = devices.reduce((acc, cur) => {
		acc[cur.node_id] = cur;
		return acc;
	}, {});
	const nodes = await performQuery("SELECT * FROM nodes");
	const nodesMap = nodes.reduce((acc, cur) => {
		acc[cur.id] = cur;
		return acc;
	}, {});
	const unknownDevices = nodes.reduce((acc, cur) => {
		if (!devicesMap[cur.id]) {
			let device = "Unknown";
			if (cur.notes && cur.notes.toLowerCase().includes("omni")) {
				device = "Omni";
			}
			acc.push({
				status: "active",
				device,
				nodeId: cur.id
			});
		}
		return acc;
	}, []);

	const allDevices = [
		...devices.filter(device => nodesMap[device.nodeId]), // Only import devices on active nodes
		...unknownDevices
	].filter(device => device.status === "active");

	// Import devices
	await insertBulk(
		"devices",
		[
			"status",
			"name",
			"ssid",
			"notes",
			"create_date",
			"abandon_date",
			"device_type_id",
			"node_id",
			"lat",
			"lng",
			"alt",
			"azimuth"
		],
		allDevices,
		device => {
			const deviceNode = nodesMap[device.nodeId];
			let actualStatus = device.status;
			if (deviceNode.status !== "active") {
				actualStatus = "dead";
			}
			return [
				actualStatus,
				device.name,
				device.ssid,
				device.notes,
				device.installDate
					? new Date(device.installDate)
					: deviceNode.create_date,
				device.abandonDate
					? new Date(device.abandonDate)
					: deviceNode.abandon_date,
				dbDeviceTypeMap[device.device].id,
				device.nodeId,
				deviceNode.lat,
				deviceNode.lng,
				deviceNode.alt,
				device.azimuth || 0
			];
		}
	);
}

const getLinksQuery = `SELECT
	devices.*,
	device_types.name AS type
FROM
	devices
	JOIN device_types ON device_types.id = devices.device_type_id`;

async function importLinks(links) {
	const devices = await performQuery(getLinksQuery);
	const devicesMap = devices.reduce((acc, cur) => {
		if (cur.type === "Unknown" && acc[cur.node_id]) return acc;
		acc[cur.node_id] = cur;
		return acc;
	}, {});

	await insertBulk(
		"links",
		["device_a_id", "device_b_id", "status", "create_date"],
		links.filter(link => link.status === "active"),
		link => {
			const deviceA = devicesMap[link.from];
			const deviceB = devicesMap[link.to];
			if (!deviceA || !deviceB) {
				throw new Error(
					`Device not found for node ${link.from} or ${link.to}`
				);
			}
			const create_date = isAfter(
				deviceA.create_date,
				deviceB.create_date
			)
				? deviceA.create_date
				: deviceB.create_date;

			let actualStatus = link.status;
			if (deviceA.status !== "active" || deviceB.status !== "active") {
				actualStatus = "dead";
			}

			return [deviceA.id, deviceB.id, actualStatus, create_date];
		}
	);
}

async function importMembers(nodes) {
	const emailMap = {};

	// Cluster nodes by email
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];
		const lowerEmail = (node.memberEmail || "").toLowerCase();
		emailMap[lowerEmail] = emailMap[lowerEmail] || [];
		emailMap[lowerEmail].push(node);
	}

	// Use first node from each cluster + filter nodes with missing member info
	const clusteredNodes = Object.values(emailMap)
		.map(email => email[0]) // TODO: Something better
		.filter(node => {
			if (!node.memberEmail) {
				console.log(`Node ${node.id} missing email`);
				return false;
			}
			return true;
		});

	await insertBulk(
		"members",
		["name", "email", "phone"],
		clusteredNodes,
		node => [
			node.memberName,
			node.memberEmail.toLowerCase(),
			node.memberPhone
		]
	);
}

async function importJoinRequests(nodes) {
	const buildings = await performQuery("SELECT * FROM buildings");
	const buildingsByAddress = buildings.reduce((acc, cur) => {
		acc[cur.address] = cur;
		return acc;
	}, {});

	const members = await performQuery("SELECT * FROM members");
	const membersByEmail = members.reduce((acc, cur) => {
		acc[cur.email] = cur;
		return acc;
	}, {});

	const panoNodesRes = await fetch("https://node-db.netlify.com/nodes.json");
	const panoNodes = await panoNodesRes.json();
	const panoNodesMap = panoNodes.reduce((acc, cur) => {
		acc[cur.id] = cur;
		return acc;
	}, {});

	const nodesWithIDs = [];
	const clusteredNodes = getClusteredNodes(nodes);

	for (var i = 0; i < clusteredNodes.length; i++) {
		const cluster = clusteredNodes[i];
		const firstNode = cluster[0];

		if (!firstNode.address || !firstNode.memberEmail) {
			console.log(`Invalid join request: Node ${firstNode.id}`);
			continue;
		}

		const building = buildingsByAddress[firstNode.address];
		if (!building) {
			console.log(`Building not found: ${firstNode.address}`);
			continue;
		}

		for (var j = 0; j < cluster.length; j++) {
			const node = cluster[j];
			const member =
				membersByEmail[(node.memberEmail || "").toLowerCase()];
			if (!member) {
				console.log(
					`Member not found: ${(
						node.memberEmail || ""
					).toLowerCase()}`
				);
				continue;
			}
			nodesWithIDs.push({
				...node,
				buildingId: building.id,
				memberId: member.id
			});
		}
	}

	let maxRequestId = 1;
	await insertBulk(
		"requests",
		["id", "status", "date", "roof_access", "building_id", "member_id"],
		nodesWithIDs.filter(node => {
			if (!node.requestDate) {
				console.log(`Node ${node.id} missing request date`);
				return false;
			}
			maxRequestId = Math.max(maxRequestId, node.id);
			return true;
		}),
		node => {
			const status =
				node.status === "Installed"
					? "installed"
					: node.status === "Abandoned" ||
					  node.status === "Unsubscribe" ||
					  node.status === "Not Interested" ||
					  node.status === "No Reply" ||
					  node.status === "Invalid" ||
					  node.status === "Dupe"
					? "dead"
					: "active";
			return [
				node.id,
				status,
				new Date(node.requestDate),
				node.roofAccess,
				node.buildingId,
				node.memberId
			];
		}
	);
	await performQuery(
		`ALTER SEQUENCE requests_id_seq RESTART WITH ${maxRequestId + 1}`
	);

	const joinRequests = await performQuery("SELECT * FROM requests");
	const joinRequestsByDate = joinRequests.reduce((acc, cur) => {
		acc[cur.date.getTime() / 1000] = cur;
		return acc;
	}, {});

	const panoramas = panoNodes
		.filter(node => node.panoramas)
		.reduce((acc, cur) => {
			const curDate = new Date(cur.requestDate);
			const joinRequest = joinRequestsByDate[curDate.getTime() / 1000];
			if (!joinRequest) {
				console.log("Join request not found", curDate.getTime() / 1000);
				return acc;
			}
			acc.push(
				...cur.panoramas.map(file => ({
					url: `https://node-db.netlify.com/panoramas/${file}`,
					date: new Date(cur.requestDate), // Should be date submitted
					joinRequestId: joinRequest.id
				}))
			);
			return acc;
		}, []);

	await insertBulk(
		"panoramas",
		["url", "date", "request_id"],
		panoramas,
		panorama => [panorama.url, panorama.date, panorama.joinRequestId]
	);
}

async function importPanoramas(node) {
	const panoramas = nodes
		.filter(node => node.panoramas)
		.reduce((acc, cur) => {
			acc.push(
				...cur.panoramas.map(file => ({
					url: `https://node-db.netlify.com/panoramas/${file}`,
					date: new Date(cur.requestDate) // Should be date submitted
				}))
			);
			return acc;
		}, []);
	return await insertBulk(
		"panoramas",
		["url", "date"],
		panoramas,
		panorama => [panorama.url, panorama.date]
	);
}

async function importAppointments() {
	const appointmentsRes = await fetch(
		`https://acuityscheduling.com/api/v1/appointments?max=25&calendarID=${process.env.ACUITY_CALENDAR_ID}`,
		{
			headers: {
				Authorization: `Basic ${Buffer.from(
					`${process.env.ACUITY_USER_ID}:${process.env.ACUITY_API_KEY}`
				).toString("base64")}`
			}
		}
	);
	const appointments = await appointmentsRes.json();

	const newAppointments = [];
	for (var i = 0; i < appointments.length; i++) {
		const appointment = appointments[i];
		const { id, email, phone, type, datetime } = appointment;
		const [form] = appointment.forms;
		const nodeId = form.values.filter(
			value => value.name === "Node Number"
		)[0].value;
		const address = form.values.filter(
			value => value.name === "Address and Apartment #"
		)[0].value;
		const notes = form.values.filter(value => value.name === "Notes")[0]
			.value;

		// Get Member
		let [member] = await performQuery(
			"SELECT * FROM members WHERE email = $1",
			[email]
		);

		if (!member) {
			[member] = await performQuery(
				"SELECT * FROM members WHERE phone = $1",
				[phone]
			);
			if (!member) continue;
		}

		// Get Buillding
		const buildings = await performQuery(
			`SELECT
	buildings.*
FROM
	members
	JOIN requests ON requests.member_id = members.id
	JOIN buildings ON buildings.id = requests.building_id
WHERE
	members.email = $1
GROUP BY buildings.id`,
			[member.email]
		);

		let building;
		if (!buildings.length) {
			console.log(email);
		} else if (buildings.length > 1) {
			const [buildingNumber] = address.split(" ");
			[building] = buildings.filter(
				b => b.address.split(" ")[0] === buildingNumber
			);
		} else {
			[building] = buildings;
		}

		const typeMap = {
			Install: "install",
			Support: "support",
			"Site survey": "survey"
		};
		const dbType = typeMap[type];
		newAppointments.push([
			dbType,
			datetime,
			notes,
			id,
			member.id,
			building.id
		]);
	}

	await insertBulk(
		"appointments",
		["type", "date", "notes", "acuity_id", "member_id", "building_id"],
		newAppointments,
		appointment => appointment
	);
}

function getClusteredNodes(nodes) {
	// Cluster nodes by reducing lat/lng precision
	const clusterMap = {};
	nodes.forEach(node => {
		const key = geoKey(node);
		if (!key) return;
		clusterMap[key] = clusterMap[key] || [];
		clusterMap[key].push(node);
	});
	return Object.values(clusterMap);

	function geoKey(node) {
		const precision = 4;
		const [lng, lat] = node.coordinates;
		return `${parseFloat(lat).toFixed(precision)}-${parseFloat(lng).toFixed(
			precision
		)}`;
	}
}
