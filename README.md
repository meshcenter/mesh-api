# NYC Mesh API

🚧 Work in progress!

## TODO

- [ ] Handle multiple members associated with a node
- [ ] Tests
- [ ] Improve los performance

## Endpoints

https://api.nycmesh.net/nodes  
https://api.nycmesh.net/links  
https://api.nycmesh.net/buildings  
https://api.nycmesh.net/members  
https://api.nycmesh.net/requests  
https://api.nycmesh.net/kml  
https://api.nycmesh.net/los   
https://api.nycmesh.net/search  

## Architecture

The API is a thin wrapper around a Postgres database. Endpoints are implemented with AWS Lambda functions, deployed and versioned by Netlify. These functions query the database directly. User access control is implemented with Auth0 tokens and roles.

## Schema

Currently, we use node numbers to represent join requests, members, and nodes. This schema is an attempt to detangle our data and create a common definition of the various components of the mesh.

### Building

A physical location.

-   id
-   address
-   lat
-	lng
-	alt
-   bin (optional) // NYC Building ID Number
-   notes (optional)

### Member

A person in the mesh community. For example, a node-owner, donor or installer.

-   id
-   name
-   email
-   phone

### Node

A specific location on the network. Typically one per building.

-   id
-   lat
-	lng
-	alt
-	status (active, dead)
-   name (optional) // e.g. "Saratoga", "SN1"
-   location (optional) // Human readable location, e.g. "Roof", "Basement"
-   notes (optional)
-   create_date
-   abandon_date (optional)
-   building_id
-   member_id

### Join Request

-   id
-   date
-   roof_access
-   member_id
-   building_id

### Panorama

-   id
-   url
-   date
-   request_id

### Device Type

-   id
-   name
-   manufacturer
-   range
-   width

### Device

A unit of hardware. Routers, radios, servers, etc.

-   id
-   status (in stock, active, dead)
-   name (optional)
-   ssid (optional)
-   notes (optional)
-	lat
-	lng
-	alt
-   azimuth (direction in degrees, default 0)
-   create_date
-   abandon_date (optional)
-	device_type_id
-   node_id

### Link

A connection between two devices. For example, an ethernet cable or wireless connection.

-   id
-	status (active, dead)
-	create_date
-   device_a_id
-   device_b_id

## Example Queries

### Most join requests by member

```sql
SELECT
	COUNT(members.id) AS count,
	members.name AS member_name
FROM
	requests
	RIGHT JOIN members ON requests.member_id = members.id
GROUP BY
	members.id
ORDER BY
	count DESC;
```

### Join requests in active node buildings

```sql
SELECT
	SUBSTRING(buildings.address, 1, 64) AS building_address,
	COUNT(DISTINCT requests.member_id) AS request_count,
	COUNT(DISTINCT nodes.member_id) AS node_count,
	JSON_AGG(DISTINCT nodes.id) AS node_ids,
	JSON_AGG(DISTINCT members.email) AS request_emails
FROM
	buildings
	JOIN requests ON buildings.id = requests.building_id
	JOIN members ON members.id = requests.member_id
	JOIN nodes ON buildings.id = nodes.building_id
WHERE
	nodes.status = 'active'
GROUP BY
	buildings.id
HAVING
	COUNT(DISTINCT requests.member_id) > COUNT(DISTINCT nodes.member_id)
ORDER BY
	request_count DESC
```

### Tallest buildings with panos

```sql
SELECT
buildings.alt,
COUNT(DISTINCT requests.id) as request_count,
SUBSTRING(buildings.address, 1, 64) as building_address,
ARRAY_AGG(DISTINCT nodes.id) as node_ids,
ARRAY_AGG(DISTINCT panoramas.url) as pano_ids
FROM buildings
JOIN requests
ON buildings.id = requests.building_id
FULL JOIN nodes
ON buildings.id = nodes.building_id
JOIN panoramas
ON requests.id = panoramas.request_id
WHERE requests.roof_access IS TRUE
GROUP BY buildings.id
ORDER BY buildings.alt DESC;
```

### Most join requests by building

```sql
SELECT
SUBSTRING(buildings.address, 1, 64) as building_address,
COUNT(buildings.id) as count
FROM requests
RIGHT JOIN buildings
ON requests.building_id = buildings.id
GROUP BY buildings.id
ORDER BY count DESC;
```

### And node count

```sql
SELECT
buildings.alt as building_height,
-- COUNT(requests.id) as request_count,
COUNT(buildings.id) as node_count,
SUBSTRING (buildings.address, 1, 64) as building_address
FROM nodes
RIGHT JOIN buildings
ON nodes.building_id = buildings.id
RIGHT JOIN requests
ON nodes.building_id = requests.building_id
GROUP BY buildings.id
ORDER BY node_count DESC;
```

### Node ids in building

```sql
SELECT array_agg(id) FROM nodes WHERE nodes.building_id = \$1;
```

### Most nodes by building

```sql
SELECT
buildings.alt as building_height,
COUNT(buildings.id) as node_count,
SUBSTRING (buildings.address, 1, 64) as building_address
FROM nodes
RIGHT JOIN buildings
ON nodes.building_id = buildings.id
GROUP BY buildings.id
ORDER BY node_count DESC;
```

### Nodes and join requests by building

```sql
SELECT
buildings.id,
COUNT(DISTINCT requests.id) as request_count,
COUNT(DISTINCT nodes.id) as node_count,
ARRAY_AGG(DISTINCT nodes.id) as node_ids,
SUBSTRING(buildings.address, 1, 64) as building_address
FROM buildings
JOIN requests
ON buildings.id = requests.building_id
JOIN nodes
ON buildings.id = nodes.building_id
GROUP BY buildings.id
ORDER BY request_count DESC;
```

### Tallest buildings

```sql
SELECT
buildings.alt as building_height,
COUNT(nodes.id) as node_count,
SUBSTRING(buildings.address, 1, 64) as building_address
FROM nodes
RIGHT JOIN buildings
ON nodes.building_id = buildings.id
GROUP BY buildings.id
ORDER BY building_height DESC;
```

### Tallest buildings with nodes

```sql
SELECT
buildings.id as building_id,
buildings.alt as building_height,
COUNT(nodes.id) as node_count,
array_agg(nodes.id) as node_ids,
SUBSTRING(buildings.address, 1, 64) as building_address
FROM buildings
LEFT JOIN nodes
ON buildings.id = nodes.building_id
GROUP BY buildings.id
-- HAVING COUNT(nodes.id) > 0 -- Toggle this line to hide/show nodeless buildings
ORDER BY building_height DESC;
```

### Tallest buildings with join requests

```sql
SELECT
buildings.id as building_id,
buildings.alt as building_height,
COUNT(requests.id) as request_count,
array_agg(requests.id) as request_ids,
SUBSTRING(buildings.address, 1, 64) as building_address
FROM buildings
LEFT JOIN requests
ON buildings.id = requests.building_id
GROUP BY buildings.id
-- HAVING COUNT(nodes.id) > 0 -- Toggle this line to hide/show nodeless buildings
ORDER BY building_height DESC;
```
