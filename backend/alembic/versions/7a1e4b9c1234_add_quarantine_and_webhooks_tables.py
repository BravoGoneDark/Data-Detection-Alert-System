"""add quarantine_records and webhook_configs tables

Revision ID: 7a1e4b9c1234
Revises: 3bef587b4f51
Create Date: 2026-08-23 14:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a1e4b9c1234'
down_revision: Union[str, Sequence[str], None] = '3bef587b4f51'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'quarantine_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('reason', sa.String(), nullable=False),
        sa.Column('trigger_anomaly_id', sa.Integer(), nullable=True),
        sa.Column('risk_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='ACTIVE'),
        sa.Column('quarantined_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('released_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('released_by', sa.String(), nullable=True),
        sa.Column('release_notes', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['trigger_anomaly_id'], ['anomaly_events.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_quarantine_records_id'), 'quarantine_records', ['id'], unique=False)
    op.create_index(op.f('ix_quarantine_records_user_id'), 'quarantine_records', ['user_id'], unique=False)
    op.create_index(op.f('ix_quarantine_records_username'), 'quarantine_records', ['username'], unique=False)
    op.create_index(op.f('ix_quarantine_records_status'), 'quarantine_records', ['status'], unique=False)
    op.create_index(op.f('ix_quarantine_records_quarantined_at'), 'quarantine_records', ['quarantined_at'], unique=False)
    op.create_index(op.f('ix_quarantine_records_trigger_anomaly_id'), 'quarantine_records', ['trigger_anomaly_id'], unique=False)

    op.create_table(
        'webhook_configs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('url', sa.String(), nullable=False),
        sa.Column('secret_token', sa.String(), nullable=True),
        sa.Column('event_types_json', sa.String(), nullable=False, server_default='["ALL"]'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('last_triggered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failure_count', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_webhook_configs_id'), 'webhook_configs', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_webhook_configs_id'), table_name='webhook_configs')
    op.drop_table('webhook_configs')
    op.drop_index(op.f('ix_quarantine_records_trigger_anomaly_id'), table_name='quarantine_records')
    op.drop_index(op.f('ix_quarantine_records_quarantined_at'), table_name='quarantine_records')
    op.drop_index(op.f('ix_quarantine_records_status'), table_name='quarantine_records')
    op.drop_index(op.f('ix_quarantine_records_username'), table_name='quarantine_records')
    op.drop_index(op.f('ix_quarantine_records_user_id'), table_name='quarantine_records')
    op.drop_index(op.f('ix_quarantine_records_id'), table_name='quarantine_records')
    op.drop_table('quarantine_records')
