import { useEffect, useMemo, useState } from 'react';
import { PlusOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Drawer,
  Input,
  Row,
  Tag,
  Typography,
} from 'antd';
import type { Permission, RoleWithPermissions } from '../../api/roles.api';
import { getApiErrorMessage } from '../../api/client';
import {
  useCreateRole,
  usePermissions,
  useRoles,
  useSetRolePermissions,
} from '../../hooks/useRoles';

const { Title, Text } = Typography;

const GROUP_LABELS: Record<string, string> = {
  products: 'Productos y catálogos',
  sales: 'Ventas',
  purchases: 'Compras',
  inventory: 'Inventario',
  clients: 'Clientes',
  suppliers: 'Proveedores',
  exchange_rates: 'Tasas de cambio',
  reports: 'Reportes',
  users: 'Usuarios',
};

function groupOf(code: string): string {
  return code.split(':')[0] ?? 'otros';
}

export function RolesPage() {
  const { message } = App.useApp();
  const roles = useRoles();
  const permissions = usePermissions();
  const setPermissions = useSetRolePermissions();
  const createRole = useCreateRole();

  // Drawer en modo crear (editing=null, open=true) o editar (editing=rol).
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoleWithPermissions | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isCreate = editing == null;

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setSelected(new Set());
    setOpen(true);
  };
  const openEdit = (role: RoleWithPermissions) => {
    setEditing(role);
    setSelected(new Set(role.permissions));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    if (editing) setSelected(new Set(editing.permissions));
  }, [open, editing]);

  const groups = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of permissions.data ?? []) {
      const g = groupOf(p.code);
      const arr = map.get(g) ?? [];
      arr.push(p);
      map.set(g, arr);
    }
    return [...map.entries()];
  }, [permissions.data]);

  const toggle = (code: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(code);
      else next.delete(code);
      return next;
    });

  const save = async () => {
    try {
      if (isCreate) {
        if (name.trim().length < 3) {
          message.error('El nombre del rol debe tener al menos 3 caracteres');
          return;
        }
        await createRole.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          permissions: [...selected],
        });
        message.success('Rol creado');
      } else {
        await setPermissions.mutateAsync({
          id: editing!.id,
          permissions: [...selected],
        });
        message.success('Permisos actualizados');
      }
      setOpen(false);
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo guardar'));
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <strong>Roles y permisos</strong>
          </Title>
          <Text type="secondary">
            Define qué puede hacer cada rol. Los cambios aplican al siguiente inicio de
            sesión o renovación de sesión de cada usuario.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Nuevo rol
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {(roles.data ?? []).map((role) => (
          <Col xs={24} sm={12} xl={6} key={role.id}>
            <Card loading={roles.isLoading}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SafetyCertificateOutlined style={{ color: '#3B7DDD', fontSize: 18 }} />
                <Text strong style={{ fontSize: 16, textTransform: 'capitalize' }}>
                  {role.name}
                </Text>
              </div>
              <div style={{ marginTop: 8, minHeight: 40 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {role.description ?? '—'}
                </Text>
              </div>
              <Tag style={{ marginTop: 8 }}>{role.permissions.length} permisos</Tag>
              <Button block style={{ marginTop: 12 }} onClick={() => openEdit(role)}>
                Editar permisos
              </Button>
            </Card>
          </Col>
        ))}
      </Row>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        width={520}
        title={
          isCreate ? (
            'Nuevo rol'
          ) : (
            <span style={{ textTransform: 'capitalize' }}>Permisos — {editing?.name}</span>
          )
        }
        extra={
          <Button
            type="primary"
            onClick={save}
            loading={createRole.isPending || setPermissions.isPending}
          >
            {isCreate ? 'Crear' : 'Guardar'}
          </Button>
        }
      >
        {isCreate && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">Nombre del rol</Text>
            <Input
              style={{ marginTop: 4, marginBottom: 12 }}
              placeholder="ej: supervisor"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Text type="secondary">Descripción</Text>
            <Input
              style={{ marginTop: 4 }}
              placeholder="Opcional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        )}

        <Text type="secondary">Selecciona los permisos de este rol:</Text>
        {groups.map(([group, perms]) => (
          <div key={group} style={{ marginBottom: 8 }}>
            <Divider orientation="left" style={{ margin: '12px 0' }}>
              <Text strong>{GROUP_LABELS[group] ?? group}</Text>
            </Divider>
            {perms.map((p) => (
              <div key={p.code} style={{ padding: '4px 0' }}>
                <Checkbox
                  checked={selected.has(p.code)}
                  onChange={(e) => toggle(p.code, e.target.checked)}
                >
                  {p.description ?? p.code}{' '}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ({p.code})
                  </Text>
                </Checkbox>
              </div>
            ))}
          </div>
        ))}
      </Drawer>
    </div>
  );
}
