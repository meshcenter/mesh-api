"""Create requests table

Revision ID: 7f8c6357e011
Revises: 8cc84140cbbc
Create Date: 2019-10-20 18:17:56.916324

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "7f8c6357e011"
down_revision = "8cc84140cbbc"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "requests",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("date", sa.TIMESTAMP, nullable=False),
        sa.Column(
            "roof_access",
            sa.Enum("yes", "no", "maybe", name="roof_access"),
            nullable=False,
        ),
        sa.Column("osticket_id", sa.Integer),
        sa.Column("member_id", sa.Integer, sa.ForeignKey("members.id")),
        sa.Column("building_id", sa.Integer, sa.ForeignKey("buildings.id")),
    )


def downgrade():
    op.drop_table("requests")
    op.execute("DROP TYPE roof_access")
