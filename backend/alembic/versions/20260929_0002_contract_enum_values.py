"""align enum values with the §2.3 contract

Revision ID: 20260929_0002
Revises: 20260924_0001
Create Date: 2026-09-29 16:10:00.000000

The contract fixes the value sets (lowercase):

    status:   open · in_progress · resolved · rejected      (default open)
    category: water · electricity · sanitation · roads · streetlights · other
    priority: high · normal · low

Legacy rows are rewritten in place: SUBMITTED and TRIAGED both become open,
WASTE becomes streetlights (the slot the contract added), and MEDIUM/CRITICAL
fold into normal/high respectively.
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260929_0002"
down_revision: str | None = "20260924_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_STATUS_MAP = """
    CASE status::text
        WHEN 'SUBMITTED' THEN 'open'
        WHEN 'TRIAGED' THEN 'open'
        WHEN 'IN_PROGRESS' THEN 'in_progress'
        WHEN 'RESOLVED' THEN 'resolved'
        WHEN 'REJECTED' THEN 'rejected'
    END
"""

_CATEGORY_MAP = """
    CASE category::text
        WHEN 'WATER' THEN 'water'
        WHEN 'ROADS' THEN 'roads'
        WHEN 'ELECTRICITY' THEN 'electricity'
        WHEN 'WASTE' THEN 'streetlights'
        WHEN 'SANITATION' THEN 'sanitation'
        WHEN 'OTHER' THEN 'other'
    END
"""

_PRIORITY_MAP = """
    CASE priority::text
        WHEN 'LOW' THEN 'low'
        WHEN 'MEDIUM' THEN 'normal'
        WHEN 'HIGH' THEN 'high'
        WHEN 'CRITICAL' THEN 'high'
    END
"""


def _replace_enum(column: str, old_type: str, new_labels: list[str], mapping: str) -> None:
    """Swap a native enum type in place, rewriting every row through `mapping`."""
    op.execute(f"ALTER TYPE {old_type} RENAME TO {old_type}_legacy")
    labels = ", ".join(f"'{label}'" for label in new_labels)
    op.execute(f"CREATE TYPE {old_type} AS ENUM ({labels})")
    op.execute(
        f"ALTER TABLE complaints ALTER COLUMN {column} TYPE {old_type} "
        f"USING ({mapping})::{old_type}"
    )
    op.execute(f"DROP TYPE {old_type}_legacy")


def upgrade() -> None:
    _replace_enum(
        "status",
        "statusenum",
        ["open", "in_progress", "resolved", "rejected"],
        _STATUS_MAP,
    )
    # §2.3: status enum defaults to open at the database level, not only in the app.
    op.execute("ALTER TABLE complaints ALTER COLUMN status SET DEFAULT 'open'")

    _replace_enum(
        "category",
        "categoryenum",
        ["water", "roads", "electricity", "streetlights", "sanitation", "other"],
        _CATEGORY_MAP,
    )

    _replace_enum(
        "priority",
        "priorityenum",
        ["low", "normal", "high"],
        _PRIORITY_MAP,
    )


def downgrade() -> None:
    _replace_enum(
        "status",
        "statusenum",
        ["SUBMITTED", "TRIAGED", "IN_PROGRESS", "RESOLVED", "REJECTED"],
        """
        CASE status::text
            WHEN 'open' THEN 'TRIAGED'
            WHEN 'in_progress' THEN 'IN_PROGRESS'
            WHEN 'resolved' THEN 'RESOLVED'
            WHEN 'rejected' THEN 'REJECTED'
        END
        """,
    )
    op.execute("ALTER TABLE complaints ALTER COLUMN status DROP DEFAULT")

    _replace_enum(
        "category",
        "categoryenum",
        ["WATER", "ROADS", "ELECTRICITY", "WASTE", "SANITATION", "OTHER"],
        """
        CASE category::text
            WHEN 'water' THEN 'WATER'
            WHEN 'roads' THEN 'ROADS'
            WHEN 'electricity' THEN 'ELECTRICITY'
            WHEN 'streetlights' THEN 'WASTE'
            WHEN 'sanitation' THEN 'SANITATION'
            WHEN 'other' THEN 'OTHER'
        END
        """,
    )

    _replace_enum(
        "priority",
        "priorityenum",
        ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        """
        CASE priority::text
            WHEN 'low' THEN 'LOW'
            WHEN 'normal' THEN 'MEDIUM'
            WHEN 'high' THEN 'HIGH'
        END
        """,
    )
