"""create complaints table

Revision ID: 20260924_0001
Revises:
Create Date: 2026-09-24 15:50:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260924_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "complaints",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("location", sa.String(length=200), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "SUBMITTED",
                "TRIAGED",
                "IN_PROGRESS",
                "RESOLVED",
                "REJECTED",
                name="statusenum",
            ),
            nullable=False,
        ),
        sa.Column(
            "category",
            sa.Enum(
                "WATER",
                "ROADS",
                "ELECTRICITY",
                "WASTE",
                "SANITATION",
                "OTHER",
                name="categoryenum",
            ),
            nullable=True,
        ),
        sa.Column(
            "priority",
            sa.Enum("LOW", "MEDIUM", "HIGH", "CRITICAL", name="priorityenum"),
            nullable=True,
        ),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("triaged_by", sa.String(length=100), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_complaints_category"), "complaints", ["category"], unique=False)
    op.create_index(op.f("ix_complaints_created_at"), "complaints", ["created_at"], unique=False)
    op.create_index(op.f("ix_complaints_priority"), "complaints", ["priority"], unique=False)
    op.create_index(op.f("ix_complaints_status"), "complaints", ["status"], unique=False)
    op.create_index(op.f("ix_complaints_title"), "complaints", ["title"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_complaints_title"), table_name="complaints")
    op.drop_index(op.f("ix_complaints_status"), table_name="complaints")
    op.drop_index(op.f("ix_complaints_priority"), table_name="complaints")
    op.drop_index(op.f("ix_complaints_created_at"), table_name="complaints")
    op.drop_index(op.f("ix_complaints_category"), table_name="complaints")
    op.drop_table("complaints")
    op.execute("DROP TYPE statusenum")
    op.execute("DROP TYPE categoryenum")
    op.execute("DROP TYPE priorityenum")
