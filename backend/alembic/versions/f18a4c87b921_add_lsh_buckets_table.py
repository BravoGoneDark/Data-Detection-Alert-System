"""add lsh_buckets table for locality-sensitive hashing

Revision ID: f18a4c87b921
Revises: d475e505391a
Create Date: 2026-08-22 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f18a4c87b921'
down_revision: Union[str, Sequence[str], None] = 'd475e505391a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'lsh_buckets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('dataset_id', sa.Integer(), nullable=False),
        sa.Column('band_type', sa.String(length=10), nullable=False),
        sa.Column('band_index', sa.Integer(), nullable=False),
        sa.Column('bucket_key', sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(['dataset_id'], ['datasets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lsh_buckets_id'), 'lsh_buckets', ['id'], unique=False)
    op.create_index(op.f('ix_lsh_buckets_dataset_id'), 'lsh_buckets', ['dataset_id'], unique=False)
    op.create_index(op.f('ix_lsh_buckets_bucket_key'), 'lsh_buckets', ['bucket_key'], unique=False)
    op.create_index('ix_lsh_buckets_key_type', 'lsh_buckets', ['bucket_key', 'band_type'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_lsh_buckets_key_type', table_name='lsh_buckets')
    op.drop_index(op.f('ix_lsh_buckets_bucket_key'), table_name='lsh_buckets')
    op.drop_index(op.f('ix_lsh_buckets_dataset_id'), table_name='lsh_buckets')
    op.drop_index(op.f('ix_lsh_buckets_id'), table_name='lsh_buckets')
    op.drop_table('lsh_buckets')
