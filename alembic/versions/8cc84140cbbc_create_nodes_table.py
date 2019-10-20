"""Create nodes table

Revision ID: 8cc84140cbbc
Revises: e2da43b6b7f1
Create Date: 2019-10-20 18:06:17.466653

"""
import enum

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "8cc84140cbbc"
down_revision = "e2da43b6b7f1"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "nodes",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("lat", sa.Float, nullable=False),
        sa.Column("lng", sa.Float, nullable=False),
        sa.Column("alt", sa.Float, nullable=False),
        sa.Column("status", sa.Enum("active", "dead", name="node_status")),
        sa.Column("location", sa.Text),
        sa.Column("name", sa.Text),
        sa.Column("notes", sa.Text),
        sa.Column("creation_date", sa.TIMESTAMP, nullable=False),
        sa.Column("abandon_date", sa.TIMESTAMP),
        sa.Column("building_id", sa.Integer, sa.ForeignKey("buildings.id")),
        sa.Column("member_id", sa.Integer, sa.ForeignKey("members.id")),
    )


def downgrade():
    op.drop_table("nodes")
    op.execute("DROP TYPE node_status")
