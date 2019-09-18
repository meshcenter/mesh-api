# NYC Mesh API

🚧 Work in progress!

## Architecture

This API is a thin wrapper around a Heroku Postgres database. Endpoints are implemented with AWS Lambda functions, deployed and versioned by Netlify. These functions query the database directly, using the Heroku API to obtain credentials. User access control is implemented with Auth0 tokens and roles.

## Endpoints

https://api.nycmesh.net/nodes  
https://api.nycmesh.net/nodes/227  
https://api.nycmesh.net/buildings  
https://api.nycmesh.net/members (Auth Required)  
https://api.nycmesh.net/requests (Auth Required)

## Schema

Currently, we use node numbers to represent join requests, members, and nodes. This schema is an attempt to detangle our data and create a common definition of the various components of the mesh.

It also attempts to address some ambiguities in our current system. For example, in a building with multiple connected apartments, is the rooftop antenna and router an individual node? Or is it part of one of the apartment nodes? In this schema, devices can belong to either a node or a building.

### Building

A physical location.

-   id
-   address
-   coordinates
-   bin (optional) // NYC Building ID Number
-   notes (optional)

### Member

A person in the mesh community. For example, a node-owner, donor or installer.

-   id
-   name
-   email
-   phone

### Node

A specific location on the network. For example, an individual apartment, a rooftop access point, or an upstream internet connection.

-   id
-   coordinates
-   name (optional) // e.g. "Saratoga", "SN1"
-   location (optional) // Human readable location, e.g. "Apt 4B", "Basement"
-   notes (optional)
-   install_date
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
-   join_request_id

### Device Type

-   id
-   name
-   manufacturer
-   directional
-   range
-   angle

### Device

A unit of hardware. Routers, radios, servers, etc.

-   id
-   type (Device Type)
-   node
-   status (in stock, active, dead)
-   coordinates
-   azimuth (direction in degrees, default 0)
-   name (optional)
-   ssid (optional)
-   notes (optional)
-   install_date
-   abandon_date (optional)

### Link

A connection between two devices. For example, an ethernet cable or wireless connection.

-   id
-   device_a
-   device_b

### Install

-   id
-   node
-   date
-   node_id
-   install_leader_id (Member)
-   install_trainee_ids (optional) (Member)
-   installee_id (Member)

### Speed Test

-   id
-   date
-   node_id

## Example Queries

### Most join requests by member

```sql
SELECT
COUNT(members.id) as count,
members.name as member_name
FROM join_requests
RIGHT JOIN members
ON join_requests.member_id = members.id
GROUP BY members.id
ORDER BY count DESC;
```

### Join requests in active node buildings

```sql
SELECT
SUBSTRING(buildings.address, 1, 64) as building_address,
COUNT(DISTINCT join_requests.member_id) as request_count,
COUNT(DISTINCT nodes.member_id) as node_count,
ARRAY_AGG(DISTINCT nodes.id) as node_ids,
ARRAY_AGG(DISTINCT members.email) as request_emails
FROM buildings
JOIN join_requests
ON buildings.id = join_requests.building_id
JOIN members
ON members.id = join_requests.member_id
JOIN nodes
ON buildings.id = nodes.building_id
WHERE nodes.abandoned IS NULL
GROUP BY buildings.id
HAVING COUNT(DISTINCT join_requests.member_id) > COUNT(DISTINCT nodes.member_id)
ORDER BY request_count DESC
```

### Tallest buildings with panos

```sql
SELECT
buildings.alt,
COUNT(DISTINCT join_requests.id) as request_count,
SUBSTRING(buildings.address, 1, 64) as building_address,
ARRAY_AGG(DISTINCT nodes.id) as node_ids,
ARRAY_AGG(DISTINCT panoramas.url) as pano_ids
FROM buildings
JOIN join_requests
ON buildings.id = join_requests.building_id
FULL JOIN nodes
ON buildings.id = nodes.building_id
JOIN panoramas
ON join_requests.id = panoramas.join_request_id
WHERE join_requests.roof_access IS TRUE
GROUP BY buildings.id
ORDER BY buildings.alt DESC;
```

### Most join requests by building

```sql
SELECT
SUBSTRING(buildings.address, 1, 64) as building_address,
COUNT(buildings.id) as count
FROM join_requests
RIGHT JOIN buildings
ON join_requests.building_id = buildings.id
GROUP BY buildings.id
ORDER BY count DESC;
```

### And node count

```sql
SELECT
buildings.alt as building_height,
-- COUNT(join_requests.id) as request_count,
COUNT(buildings.id) as node_count,
SUBSTRING (buildings.address, 1, 64) as building_address
FROM nodes
RIGHT JOIN buildings
ON nodes.building_id = buildings.id
RIGHT JOIN join_requests
ON nodes.building_id = join_requests.building_id
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
COUNT(DISTINCT join_requests.id) as request_count,
COUNT(DISTINCT nodes.id) as node_count,
ARRAY_AGG(DISTINCT nodes.id) as node_ids,
SUBSTRING(buildings.address, 1, 64) as building_address
FROM buildings
JOIN join_requests
ON buildings.id = join_requests.building_id
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
COUNT(join_requests.id) as request_count,
array_agg(join_requests.id) as request_ids,
SUBSTRING(buildings.address, 1, 64) as building_address
FROM buildings
LEFT JOIN join_requests
ON buildings.id = join_requests.building_id
GROUP BY buildings.id
-- HAVING COUNT(nodes.id) > 0 -- Toggle this line to hide/show nodeless buildings
ORDER BY building_height DESC;
```
