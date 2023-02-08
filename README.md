# Mesh API

![Screenshot of Google Earth showing data from Mesh API. There are blue dots showing nodes on buildings and green and yellow lines showing links between nodes.](/image.png?raw=true "Screenshot")

🚧 Work in progress!

## Contributing

Before committing code, please run `yarn precommit` to format your code and run the tests. Only commit your code when it's formatted and the tests pass. You can add it as a git [precommit hook](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks) if you like.

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
DATABASE_URL=postgres://$user:$pass@$host:$port/$db
LOS_DATABASE_URL=postgres://$user:$pass@$host:$port/$db

S3_BUCKET=
S3_ENDPOINT=
S3_ID=
S3_KEY=

JWKS_URI=
JWT_AUDIENCE=
JWT_ISSUER=

SLACK_TOKEN=
SLACK_INSTALL_CHANNEL=
SLACK_PANO_CHANNEL=
SLACK_REQUEST_CHANNEL=

OSTICKET_API_KEY=

ACUITY_USER_ID=
ACUITY_API_KEY=

SPREADSHEET_APPS_SCRIPT_WEBHOOK_URL=
```

### Dev Database Setup

A simple dev database can be configured by running

```
docker run -d -p 5432:5432 \
           --name meshcenter-test-db \
           -e POSTGRES_USER=meshdb\
           -e POSTGRES_PASSWORD=meshdb \
           -e POSTGRES_DB=meshdb \
           postgres 
```

Add these credentials to the `.env` file using a connection URL:
`postgres://meshdb:meshdb@127.0.0.1:5432/meshdb?sslmode=disable`

Finally, initialize the database tables by running
`yarn migrate up`

## Schema

Currently, we use node numbers to represent join requests, members, and nodes. This schema is an attempt to detangle our data and create a common definition of the various components of the mesh.

### Building

A physical location.

| id  | address | lat | lng | alt | bin | notes |
| --- | ------- | --- | --- | --- | --- | ----- |

### Member

A person in the mesh community. For example, a node-owner, donor or installer.

| id  | name | email | phone |
| --- | ---- | ----- | ----- |

### Node

A specific location on the network. Typically one per building.

| id  | lat | lng | alt | status | name | location |
| --- | --- | --- | --- | ------ | ---- | -------- |

- id
- lat
- lng
- alt
- status (active, dead)
- name (optional) // e.g. "Saratoga", "SN1"
- location (optional) // Human readable location, e.g. "Roof", "Basement"
- notes (optional)
- create_date
- abandon_date (optional)
- building_id
- member_id

### Join Request

- id
- date
- roof_access
- member_id
- building_id

### Panorama

- id
- url
- date
- request_id

### Device Type

- id
- name
- manufacturer
- range
- width

### Device

A unit of hardware. Routers, radios, servers, etc.

- id
- status (in stock, active, dead)
- name (optional)
- ssid (optional)
- notes (optional)
- lat
- lng
- alt
- azimuth (direction in degrees, default 0)
- create_date
- abandon_date (optional)
- device_type_id
- node_id

### Link

A connection between two devices. For example, an ethernet cable or wireless connection.

- id
- status (active, dead)
- create_date
- device_a_id
- device_b_id

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

Install lxml:

```python
pip3 install lxml
```

Set up the db:

```bash
node scripts/reset-los-db.js
```

Download the [building data](https://www1.nyc.gov/site/doitt/initiatives/3d-building.page):

```bash
curl -o building_data.zip http://maps.nyc.gov/download/3dmodel/DA_WISE_GML.zip
unzip building_data.zip -d building_data
rm building_data.zip
```

Insert the data

```bash
{
	python3 ./scripts/gml_to_pgsql.py ./building_data/DA_WISE_GMLs/DA1_3D_Buildings_Merged.gml buildings
	python3 ./scripts/gml_to_pgsql.py ./building_data/DA_WISE_GMLs/DA2_3D_Buildings_Merged.gml buildings
	python3 ./scripts/gml_to_pgsql.py ./building_data/DA_WISE_GMLs/DA3_3D_Buildings_Merged.gml buildings
	python3 ./scripts/gml_to_pgsql.py ./building_data/DA_WISE_GMLs/DA4_3D_Buildings_Merged.gml buildings
	python3 ./scripts/gml_to_pgsql.py ./building_data/DA_WISE_GMLs/DA5_3D_Buildings_Merged.gml buildings
	python3 ./scripts/gml_to_pgsql.py ./building_data/DA_WISE_GMLs/DA6_3D_Buildings_Merged.gml buildings
	python3 ./scripts/gml_to_pgsql.py ./building_data/DA_WISE_GMLs/DA7_3D_Buildings_Merged.gml buildings
	python3 ./scripts/gml_to_pgsql.py ./building_data/DA_WISE_GMLs/DA8_3D_Buildings_Merged.gml buildings
	python3 ./scripts/gml_to_pgsql.py ./building_data/DA_WISE_GMLs/DA9_3D_Buildings_Merged.gml buildings
	python3 ./scripts/gml_to_pgsql.py ./building_data/DA_WISE_GMLs/DA10_3D_Buildings_Merged.gml buildings
	python3 ./scripts/gml_to_pgsql.py ./building_data/DA_WISE_GMLs/DA11_3D_Buildings_Merged.gml buildings
	python3 ./scripts/gml_to_pgsql.py ./building_data/DA_WISE_GMLs/DA12_3D_Buildings_Merged.gml buildings
	python3 ./scripts/gml_to_pgsql.py ./building_data/DA_WISE_GMLs/DA13_3D_Buildings_Merged.gml buildings
	python3 ./scripts/gml_to_pgsql.py ./building_data/DA_WISE_GMLs/DA14_3D_Buildings_Merged.gml buildings
	python3 ./scripts/gml_to_pgsql.py ./building_data/DA_WISE_GMLs/DA15_3D_Buildings_Merged.gml buildings
	python3 ./scripts/gml_to_pgsql.py ./building_data/DA_WISE_GMLs/DA16_3D_Buildings_Merged.gml buildings
	python3 ./scripts/gml_to_pgsql.py ./building_data/DA_WISE_GMLs/DA17_3D_Buildings_Merged.gml buildings
	python3 ./scripts/gml_to_pgsql.py ./building_data/DA_WISE_GMLs/DA18_3D_Buildings_Merged.gml buildings
	python3 ./scripts/gml_to_pgsql.py ./building_data/DA_WISE_GMLs/DA19_3D_Buildings_Merged.gml buildings
	python3 ./scripts/gml_to_pgsql.py ./building_data/DA_WISE_GMLs/DA20_3D_Buildings_Merged.gml buildings
	python3 ./scripts/gml_to_pgsql.py ./building_data/DA_WISE_GMLs/DA21_3D_Buildings_Merged.gml buildings
} | psql $LOS_DATABASE_URL
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
