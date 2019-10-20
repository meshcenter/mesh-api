"""create members table

Revision ID: e2da43b6b7f1
Revises: 1eaf4b23ad6c
Create Date: 2019-10-20 17:59:22.205852

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "e2da43b6b7f1"
down_revision = "1eaf4b23ad6c"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "members",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.Text),
        sa.Column("email", sa.Text, nullable=False, unique=True),
        sa.Column("phone", sa.Text),
    )


def downgrade():
    op.drop_table("members")
