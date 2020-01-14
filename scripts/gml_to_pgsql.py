# coding: utf-8

# Forked from: https://github.com/Oslandia/citygml2pgsql

"""Convert CityGML buildings to PostreSQL statements for insertion in table
Before running the script, ensure that your database contains the right table.
To create the table, run:
    CREATE TABLE ny(gid SERIAL PRIMARY KEY, bldg_id varchar(255), bldg_bin varchar(255), geom GEOMETRY('MULTIPOLYGONZ', 2263))

USAGE
    gml_to_pgsql file1.gml table_name
"""

import os
import sys
import re
from lxml import etree

def linear_ring_to_wkt(ring):
    '''
    Convert a linear ring object with vertices in 3 dimensions to well-known text.
    The linear ring is defined in GML by a list of space-delimited 64-bit integers for
    each of the vertices of the ring
    '''

    dim = 3 # x, y, z
    raw_coord = ring[0].text.split()

    # Split coordinates
    coord = [raw_coord[i:i+dim] for i in range(0, len(raw_coord), dim)]

    # If ring isn't closed, close it
    if coord[0] != coord[-1]:
        coord.append(coord[0])

    # Catch degenerate rings
    if len(coord) < 4:
        sys.stderr.write( 'degenerated LinearRing gml:id="'+\
                ring.get("{http://www.opengis.net/gml}id")+'"\n')
        return None

    # Return a list of x, y, and z coordinates that together compose the LinearRing
    # in string format
    return "(" + ",".join([" ".join(c) for c in coord]) + ")"

def polygon_to_wkt(poly):
    '''
    Convert a polygon composed of multiple linear rings to well-known text
    '''
    all_rings = [linear_ring_to_wkt(ring) for ring in poly.iter(insert_namespace('LinearRing', poly)) ]

    # remove degenerate rings (i.e. those that have fewer than 4 vertices)
    sanitized = filter(None, all_rings)

    if not sanitized:
        sys.stderr.write('degenerate polygon gml:id="{}'.format(poly.get("{http://www.opengis.net/gml}id")))
        return None

    return "({})".format(",".join(sanitized))

def insert_namespace(target, root):
    '''
    Given a target string, iterate through the XML tree until we find a matching tag
    and prepend the tag's namespace. This gives us a full tag name we can pass to
    etree.iter()
    '''
    for e in root.iter():
        if e.tag is etree.Comment:
            continue
        m = re.match(r"(.*)"+target, e.tag) if e.tag else None
        if m:
            return m.groups()[0]+target
    return None

# def run_psql(filename, table_name, srid, lod, geometry_column="geom", building_id_column="building_id"):
def run_psql(filename, table_name):
    '''
    Iterate over a list of Building objects in a CityGML file, isolate just the RoofSurface polygons,
    and insert them into a PostgreSQL table
    '''
    if not os.path.exists(filename):
        raise RuntimeError("error: cannot find "+filename)

    root = etree.parse(filename)

    # Loop over the buildings
    for building in root.iter(insert_namespace('Building', root)):
        bldg_id = building.get("{http://www.opengis.net/gml}id")
        bldg_bin = ""

        # Loop over string attributes to get BIN
        for attribute in building.iter("{http://www.opengis.net/citygml/generics/1.0}stringAttribute"):
            if attribute.attrib.get("name") == "BIN":
                bldg_bin = attribute[0].text

        # Some files use 2.0 for some reason...
        for attribute in building.iter("{http://www.opengis.net/citygml/generics/2.0}stringAttribute"):
            if attribute.attrib.get("name") == "BIN":
                bldg_bin = attribute[0].text

        # Get the polygons for this building
        polys = [polygon_to_wkt(p) for p in building.iter(insert_namespace('Polygon', building))]

        if polys != None:
            sql = "INSERT INTO {} (geom, bldg_id, bldg_bin) VALUES ('SRID=2263; MULTIPOLYGON({})'::geometry, '{}', '{}');".format(
                table_name, ','.join(polys), bldg_id, bldg_bin)
            print(sql)
        else:
            sys.stderr.write( 'degenerate building geometry gml:id={}'.format(bldg_id))

if __name__ == '__main__':
    gml = sys.argv[1]
    table_name = sys.argv[2]
    sys.stderr.write("converting {}\n".format(gml))
    run_psql(sys.argv[1], sys.argv[2])

