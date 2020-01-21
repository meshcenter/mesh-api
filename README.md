# NYC Mesh API

![Screenshot of Google Earth showing data from mesh-api. There are blue dots showing nodes on buildings and green and yellow lines showing links between nodes.](/image.png?raw=true "Screenshot")

🚧 Work in progress!

## Endpoints

https://api.nycmesh.net/v1/nodes  
https://api.nycmesh.net/v1/links  
https://api.nycmesh.net/v1/buildings  
https://api.nycmesh.net/v1/members  
https://api.nycmesh.net/v1/requests  
https://api.nycmesh.net/v1/search  
https://api.nycmesh.net/v1/los  
https://api.nycmesh.net/v1/kml

## Architecture

- Netlify Functions for hosting
- Express for handling requests
- PostgreSQL for main db
- PostGIS for line of sight db
- DigitalOcean Spaces (S3) for storing panorama images
- Auth0 for access control

## Running locally

Clone the repo: `git clone git@github.com:olivernyc/nycmesh-api.git`  
Install dependencies: `yarn install`  
Run the local server: `yarn start`

You'll need a `.env` file with the following values:
```
DB_USER=
DB_PASS=
DB_HOST=
DB_PORT=
DB_NAME=

LOS_DB_USER=
LOS_DB_PASS=
LOS_DB_HOST=
LOS_DB_PORT=
LOS_DB_NAME=

S3_BUCKET=
S3_ENDPOINT=
S3_ID=
S3_KEY=

JWKS_URI=
JWT_AUDIENCE=
JWT_ISSUER=

SLACK_WEBHOOK_URL=
OSTICKET_API_KEY=
SPREADSHEET_URL=
```

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

## Line of Sight

### DB Setup

Install dependencies:

-   Python
-   Postgres
-   PostGIS

Create a table in the db:

```sql
CREATE TABLE ny(gid SERIAL PRIMARY KEY, bldg_id varchar(255), bldg_bin varchar(255), geom GEOMETRY('MULTIPOLYGONZ', 2263))
```

Download the [building data](https://www1.nyc.gov/site/doitt/initiatives/3d-building.page):

```bash
curl -o data.zip http://maps.nyc.gov/download/3dmodel/DA_WISE_GML.zip
unzip data.zip -d data
rm data.zip
```

Insert the data:

```bash
# 12 and 13 are Manhattan
python2 ./scripts/gml_to_pgsql.py ./data/DA_WISE_GMLs/DA12_3D_Buildings_Merged.gml ny | psql db
python2 ./scripts/gml_to_pgsql.py ./data/DA_WISE_GMLs/DA13_3D_Buildings_Merged.gml ny | psql db
```

Create indices:

```sql
CREATE INDEX geom_index ON ny
USING GIST (geom)
```

Now we are ready to make queries!

### Making Queries

Let's check for line of sight between [Supernode 1 and Node 3](https://www.nycmesh.net/map/nodes/227-3).

#### Step 1: Look up BINs:

Use [NYC GeoSearch](https://geosearch.planninglabs.nyc/docs/) or [NYC Building Information Search](http://a810-bisweb.nyc.gov/bisweb/bispi00.jsp).

Supernode 1 BIN: `1001389`  
Node 3 BIN: `1006184`

#### Step 2: Get building midpoints:

```sql
SELECT ST_AsText(ST_Centroid((SELECT geom FROM ny WHERE bldg_bin = '1001389'))) as a,
ST_AsText(ST_Centroid((SELECT geom FROM ny WHERE bldg_bin = '1006184'))) as b;
#                     a                     |                    b
# ------------------------------------------+------------------------------------------
#  POINT(987642.232749068 203357.276907034) | POINT(983915.956115596 198271.837494287)
# (1 row)
```

#### Step 3: Get building heights:

```sql
SELECT ST_ZMax((SELECT geom FROM ny WHERE bldg_bin = '1001389')) as a,
ST_ZMax((SELECT geom FROM ny WHERE bldg_bin = '1006184')) as b;
#         a         |        b
# ------------------+------------------
#  582.247499999998 | 120.199699999997
# (1 row)
```

#### Step 4: Check for intersections:

```sql
SELECT a.bldg_bin
FROM ny AS a
WHERE ST_3DIntersects(a.geom, ST_SetSRID('LINESTRINGZ (983915 198271 582, 987642 203357 120)'::geometry, 2263));
#  bldg_bin
# ----------
# (0 rows)
```

There are no intersections. We have line of sight!
