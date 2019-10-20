"""Create links table

Revision ID: 6e66112f5319
Revises: edd1c9b667b1
Create Date: 2019-10-20 18:29:52.734331

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "6e66112f5319"
down_revision = "edd1c9b667b1"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "links",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("status", sa.Enum("planned", "active", "dead", name="link_status")),
        sa.Column("create_date", sa.TIMESTAMP, nullable=False),
        sa.Column("device_a_id", sa.Integer, sa.ForeignKey("devices.id")),
        sa.Column("device_b_id", sa.Integer, sa.ForeignKey("devices.id")),
    )


def downgrade():
    op.drop_table("links")
    op.execute("DROP TYPE link_status")
