"""Create devices table

Revision ID: edd1c9b667b1
Revises: dfb5680f3c04
Create Date: 2019-10-20 18:24:14.578784

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "edd1c9b667b1"
down_revision = "dfb5680f3c04"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "devices",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("lat", sa.Float, nullable=False),
        sa.Column("long", sa.Float, nullable=False),
        sa.Column("alt", sa.Float, nullable=False),
        sa.Column("azimuth", sa.Integer, default=0),
        sa.Column(
            "status", sa.Enum("in stock", "active", "dead", name="device_status")
        ),
        sa.Column("name", sa.Text),
        sa.Column("ssid", sa.Text),
        sa.Column("notes", sa.Text),
        sa.Column("create_date", sa.TIMESTAMP),
        sa.Column("abandon_date", sa.TIMESTAMP),
        sa.Column("device_type_id", sa.Integer, sa.ForeignKey("device_types.id")),
        sa.Column("node_id", sa.Integer, sa.ForeignKey("nodes.id")),
    )


def downgrade():
    op.drop_table("devices")
    op.execute("DROP TYPE device_status")
