"""Create device types table

Revision ID: dfb5680f3c04
Revises: 10f3bc94702b
Create Date: 2019-10-20 18:22:28.533409

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "dfb5680f3c04"
down_revision = "10f3bc94702b"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "device_types",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("manufacturer", sa.Text),
        sa.Column("range", sa.Float, nullable=False),
        sa.Column("width", sa.Float, nullable=False),
    )


def downgrade():
    op.drop_table("device_types")
