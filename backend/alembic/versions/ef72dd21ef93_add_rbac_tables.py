"""add rbac tables

Revision ID: ef72dd21ef93
Revises: c7c0961ffdc9
Create Date: 2026-08-21 01:31:04.754012

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ef72dd21ef93'
down_revision: Union[str, Sequence[str], None] = 'c7c0961ffdc9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.create_table(
        'permissions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(), nullable=False, unique=True),
        sa.Column('description', sa.String(), nullable=True),
    )
    op.create_table(
        'roles',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(), nullable=False, unique=True),
        sa.Column('description', sa.String(), nullable=True),
    )
    op.create_table(
        'role_permissions',
        sa.Column('role_id', sa.Integer(), sa.ForeignKey('roles.id'), primary_key=True),
        sa.Column('permission_id', sa.Integer(), sa.ForeignKey('permissions.id'), primary_key=True),
    )
    op.add_column('users', sa.Column('role_id', sa.Integer(), sa.ForeignKey('roles.id'), nullable=True))
    op.add_column('datasets', sa.Column('classification', sa.String(), nullable=True))

    # ---- seed data ----
    roles_t = sa.table('roles', sa.column('id', sa.Integer), sa.column('name', sa.String), sa.column('description', sa.String))
    perms_t = sa.table('permissions', sa.column('id', sa.Integer), sa.column('name', sa.String), sa.column('description', sa.String))
    rp_t = sa.table('role_permissions', sa.column('role_id', sa.Integer), sa.column('permission_id', sa.Integer))
    users_t = sa.table('users', sa.column('id', sa.Integer), sa.column('role_id', sa.Integer))

    conn = op.get_bind()

    role_names = ["ADMIN", "FACULTY", "RESEARCHER", "STUDENT", "GUEST"]
    conn.execute(roles_t.insert(), [{"name": r, "description": r.title()} for r in role_names])

    permission_names = [
        "dataset:view", "dataset:download", "dataset:upload", "dataset:delete",
        "dataset:modify", "dataset:manage_access", "audit:view", "security:view",
        "user:manage", "alert:manage",
    ]
    conn.execute(perms_t.insert(), [{"name": p, "description": p} for p in permission_names])

    role_id_by_name = {name: id for id, name in conn.execute(sa.select(roles_t.c.id, roles_t.c.name)).fetchall()}
    perm_id_by_name = {name: id for id, name in conn.execute(sa.select(perms_t.c.id, perms_t.c.name)).fetchall()}

    # Role -> permission mapping. Review this — it's a reasonable default,
    # not a spec-mandated exact list.
    role_permission_map = {
        "ADMIN": permission_names,  # everything
        "FACULTY": ["dataset:view", "dataset:download", "dataset:upload", "dataset:modify", "audit:view"],
        "RESEARCHER": ["dataset:view", "dataset:download", "dataset:upload"],
        "STUDENT": ["dataset:view", "dataset:download", "dataset:upload"],
        "GUEST": ["dataset:view"],
    }

    rows = [
        {"role_id": role_id_by_name[role], "permission_id": perm_id_by_name[perm]}
        for role, perms in role_permission_map.items()
        for perm in perms
    ]
    conn.execute(rp_t.insert(), rows)

    # Backfill existing users to STUDENT before enforcing NOT NULL
    conn.execute(users_t.update().values(role_id=role_id_by_name["STUDENT"]))
    op.alter_column('users', 'role_id', nullable=False)


def downgrade():
    op.drop_column('users', 'role_id')
    op.drop_column('datasets', 'classification')
    op.drop_table('role_permissions')
    op.drop_table('roles')
    op.drop_table('permissions')
