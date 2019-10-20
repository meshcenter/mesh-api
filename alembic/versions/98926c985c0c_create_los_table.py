"""Create los table

Revision ID: 98926c985c0c
Revises: 6e66112f5319
Create Date: 2019-10-20 18:32:28.425833

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "98926c985c0c"
down_revision = "6e66112f5319"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "los",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("building_a_id", sa.Integer, sa.ForeignKey("buildings.id")),
        sa.Column("building_b_id", sa.Integer, sa.ForeignKey("buildings.id")),
        sa.Column("lat_a", sa.Float, nullable=False),
        sa.Column("lng_a", sa.Float, nullable=False),
        sa.Column("alt_a", sa.Float, nullable=False),
        sa.Column("lat_b", sa.Float, nullable=False),
        sa.Column("lng_b", sa.Float, nullable=False),
        sa.Column("alt_b", sa.Float, nullable=False),
    )


def downgrade():
    op.drop_table("los")
