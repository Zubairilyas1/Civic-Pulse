"""align complaints schema with contract section 2.3 minimum schema

Revision ID: 20260929_0003
Revises: 20260929_0002
Create Date: 2026-09-29 12:00:00.000000

Changes (each is a contract requirement from section 2.3):
  * id becomes a real UUID column with a server-side gen_random_uuid() default
    ("UUID, server-generated").
  * description is renamed to the contract column name ``text`` and gains a
    CHECK constraint enforcing 10-2000 chars *in the database* (the app
    already enforces it; the contract demands both).
  * location gains a CHECK constraint for 3-200 chars.
  * reporter_contact (nullable) is added.
  * summary becomes ai_summary varchar(140), single line.
  * triage_latency_ms (integer) is added.
  * created_at / updated_at become timestamptz in UTC.
  * Composite index on (status, priority) is added, plus the composite
    indexes the ORM model already declared.

All data conversions are loss-safe: existing ids are valid uuid4 strings,
timestamps were written as naive UTC, and summaries are short single-line
strings produced by the rules provider.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260929_0003"
down_revision: str | None = "20260929_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- id: UUID, server-generated -------------------------------------
    op.execute("ALTER TABLE complaints ALTER COLUMN id TYPE uuid USING id::uuid")
    op.execute("ALTER TABLE complaints ALTER COLUMN id SET DEFAULT gen_random_uuid()")

    # --- text: contract column name + DB-level length check -------------
    op.execute('ALTER TABLE complaints RENAME COLUMN description TO "text"')
    op.create_check_constraint(
        "ck_complaints_text_length",
        "complaints",
        'char_length("text") BETWEEN 10 AND 2000',
    )

    # --- location: DB-level length check --------------------------------
    op.create_check_constraint(
        "ck_complaints_location_length",
        "complaints",
        "char_length(location) BETWEEN 3 AND 200",
    )

    # --- reporter_contact (nullable) ------------------------------------
    op.add_column(
        "complaints",
        sa.Column("reporter_contact", sa.String(length=200), nullable=True),
    )

    # --- ai_summary: one line, <= 140 chars, enforced in the DB ---------
    op.execute("ALTER TABLE complaints RENAME COLUMN summary TO ai_summary")
    op.execute(
        "ALTER TABLE complaints ALTER COLUMN ai_summary TYPE varchar(140) "
        "USING left(regexp_replace(ai_summary, E'\n', ' ', 'g'), 140)"
    )
    op.create_check_constraint(
        "ck_complaints_ai_summary_one_line",
        "complaints",
        "ai_summary IS NULL OR (char_length(ai_summary) <= 140 "
        "AND position(E'\n' in ai_summary) = 0)",
    )

    # --- triage_latency_ms ----------------------------------------------
    op.add_column(
        "complaints",
        sa.Column("triage_latency_ms", sa.Integer(), nullable=True),
    )

    # --- timestamptz, UTC ------------------------------------------------
    op.execute(
        "ALTER TABLE complaints ALTER COLUMN created_at TYPE timestamptz "
        "USING created_at AT TIME ZONE 'UTC'"
    )
    op.execute(
        "ALTER TABLE complaints ALTER COLUMN updated_at TYPE timestamptz "
        "USING updated_at AT TIME ZONE 'UTC'"
    )

    # --- required composite indexes --------------------------------------
    op.create_index("idx_status_priority", "complaints", ["status", "priority"])
    op.create_index("idx_status_created_at", "complaints", ["status", "created_at"])
    op.create_index("idx_category_priority", "complaints", ["category", "priority"])


def downgrade() -> None:
    op.drop_index("idx_category_priority", table_name="complaints")
    op.drop_index("idx_status_created_at", table_name="complaints")
    op.drop_index("idx_status_priority", table_name="complaints")

    op.execute(
        "ALTER TABLE complaints ALTER COLUMN updated_at TYPE timestamp "
        "USING updated_at AT TIME ZONE 'UTC'"
    )
    op.execute(
        "ALTER TABLE complaints ALTER COLUMN created_at TYPE timestamp "
        "USING created_at AT TIME ZONE 'UTC'"
    )

    op.drop_constraint("ck_complaints_ai_summary_one_line", "complaints", type_="check")
    op.alter_column("complaints", "ai_summary", type_=sa.Text(), existing_type=sa.String(length=140))
    op.execute("ALTER TABLE complaints RENAME COLUMN ai_summary TO summary")

    op.drop_column("complaints", "triage_latency_ms")
    op.drop_column("complaints", "reporter_contact")

    op.drop_constraint("ck_complaints_location_length", "complaints", type_="check")
    op.drop_constraint("ck_complaints_text_length", "complaints", type_="check")
    op.execute('ALTER TABLE complaints RENAME COLUMN "text" TO description')

    op.execute("ALTER TABLE complaints ALTER COLUMN id DROP DEFAULT")
    op.execute("ALTER TABLE complaints ALTER COLUMN id TYPE varchar(36) USING id::text")
