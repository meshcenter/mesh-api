"""Create panoramas table

Revision ID: 10f3bc94702b
Revises: 7f8c6357e011
Create Date: 2019-10-20 18:20:37.003737

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "10f3bc94702b"
down_revision = "7f8c6357e011"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "panoramas",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("url", sa.Text, nullable=False),
        sa.Column("date", sa.TIMESTAMP, nullable=False),
        sa.Column("join_request_id", sa.Integer, sa.ForeignKey("requests.id")),
    )


def downgrade():
    op.drop_table("panoramas")
