"""create buildings table

Revision ID: 1eaf4b23ad6c
Revises:
Create Date: 2019-10-20 17:48:03.737813

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "1eaf4b23ad6c"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "buildings",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("address", sa.Text, nullable=False),
        sa.Column("lat", sa.Float, nullable=False),
        sa.Column("long", sa.Float, nullable=False),
        sa.Column("alt", sa.Float, nullable=False),
        sa.Column("bin", sa.Integer),
        sa.Column("notes", sa.Text),
    )


def downgrade():
    op.drop_table("buildings")
