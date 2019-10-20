# Mesh API database management and migration

These set of scripts are used to manage the databases powering the NYC Mesh API.

## Development

### Required environment

To run these scripts you will need access to a postgres database, and a Python environment

#### Postgres

We assume that there is a database called `mesh`, reachable by the url: `postgresql://localhost/mesh`.
This url is referenced in the [`alembic.ini`](alembic.ini#L38), you will need to change it here if your url differs.

To quickly get a database up and running locally on Mac, you can use the [Postgres.app](https://postgresapp.com), or on any platform using [Docker](https://hub.docker.com/_/postgres/).

#### Python
The scripts used to manage the database require Python 3 and the dependencies listed in [`requirements.txt`](requirements.txt).
We recommend using a [virtual environment](https://docs.python.org/3/tutorial/venv.html) to isolate these dependencies from other Python projects.


In the `nycmesh-api/alembic` directory, run:
```bash
$ python3 -m venv .venv
$ source .venv/bin/activate
$ pip install -r requirements.txt
```

### Running the scripts

With postgres running, in the `nycmesh-api/alembic` directory, run: `alembic upgrade head`.
This will execute each of the upgrade scripts, creating the database objects defined in the `nycmesh-api/alembic/versions/`.

To revert back to a clean slate, run `alembic downgrade base`.

### Defining new database objects

These scripts defining database objects live in the `nycmesh-api/alembic/versions` folder.
They use a Python library called [`alembic`](https://alembic.sqlalchemy.org/en/latest/).

Take a look at the migration script that defines the [buildings table](alembic/versions/1eaf4b23ad6c_create_buildings_table.py).
There are two functions that we need to define, `upgrade` and `downgrade`.
The `upgrade` function defines how we add new objects, such as a table.
The `downgrade` function defines how we undo that.

To create a new migration script run `alembic revision -m "some description of what you are doing"`.
This command will create a new revision script in the `alembic/versions` folder.

Take a look at the tutorials and documentation [`here`](https://alembic.sqlalchemy.org/en/latest/) to see how to use this library.

## Production

To run this against a production database, first set the environment variable: `SQLALCHEMY_URL` to the production connection url.
This will override the dev value in alembic.ini.
Then run the scripts as necessary.

For example:
```bash
$ export SQLALCHEMY_URL=postgresql://user:supersecretpassword@postgresserver:5432/mesh
$ alembic upgrade head
```
