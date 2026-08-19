import { useState } from 'react';
import {
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Space,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { User } from '@autopartes-air/shared';
import { PERMISSIONS } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import {
  useDeleteUser,
  useResetPassword,
  useUsers,
} from '../../hooks/useUsers';
import { useAuthStore } from '../../stores/auth.store';
import { UserFormModal } from './UserFormModal';
import { DataTable } from '../../components/DataTable';

const { Title, Text } = Typography;

export function UsersPage() {
  const { message, modal } = App.useApp();
  const currentUser = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManage = hasPermission(PERMISSIONS.USERS_MANAGE);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const users = useUsers({ page, limit });
  const deleteUser = useDeleteUser();
  const resetPassword = useResetPassword();

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (user: User) => {
    setEditing(user);
    setModalOpen(true);
  };

  const confirmDelete = (user: User) => {
    modal.confirm({
      title: `¿Eliminar a "${user.fullName}"?`,
      content:
        'Si el usuario tiene ventas o movimientos registrados no podrá eliminarse; desactívalo en su lugar.',
      okText: 'Eliminar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await deleteUser.mutateAsync(user.id);
          message.success('Usuario eliminado');
        } catch (err) {
          message.error(getApiErrorMessage(err, 'No se pudo eliminar'));
        }
      },
    });
  };

  const openReset = (user: User) => {
    let password = '';
    modal.confirm({
      title: `Nueva contraseña para "${user.username}"`,
      icon: <KeyOutlined />,
      content: (
        <Form layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="Contraseña (mín. 6 caracteres)">
            <Input.Password
              onChange={(e) => {
                password = e.target.value;
              }}
              placeholder="••••••••"
            />
          </Form.Item>
        </Form>
      ),
      okText: 'Cambiar',
      cancelText: 'Cancelar',
      onOk: async () => {
        if (password.length < 6) {
          message.error('La contraseña debe tener al menos 6 caracteres');
          throw new Error('too short');
        }
        try {
          await resetPassword.mutateAsync({ id: user.id, password });
          message.success('Contraseña actualizada');
        } catch (err) {
          message.error(getApiErrorMessage(err, 'No se pudo cambiar la contraseña'));
          throw err;
        }
      },
    });
  };

  const columns: ColumnsType<User> = [
    {
      title: 'Usuario',
      dataIndex: 'username',
      render: (u: string, row) => (
        <span>
          <Text strong>{u}</Text>
          {row.id === currentUser?.id && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              tú
            </Tag>
          )}
        </span>
      ),
    },
    { title: 'Nombre', dataIndex: 'fullName' },
    {
      title: 'Rol',
      dataIndex: 'roleName',
      width: 130,
      render: (r: string) => (
        <Tag style={{ textTransform: 'capitalize' }}>{r}</Tag>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      width: 110,
      render: (active: boolean) =>
        active ? <Tag color="success">Activo</Tag> : <Tag>Inactivo</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 130,
      align: 'right',
      render: (_, user) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEdit(user)}
            title="Editar"
          />
          <Button
            type="text"
            icon={<KeyOutlined />}
            onClick={() => openReset(user)}
            title="Cambiar contraseña"
          />
          {user.id !== currentUser?.id && (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(user)}
              title="Eliminar"
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          // En telefono el titulo y las acciones se apilan en vez de aplastarse.
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <strong>Usuarios</strong>
          </Title>
          <Text type="secondary">Gestión de usuarios del sistema</Text>
        </div>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Nuevo usuario
          </Button>
        )}
      </div>

      <Card>
        <DataTable<User>
          rowKey="id"
          columns={columns}
          dataSource={users.data?.data ?? []}
          loading={users.isLoading}
          mobileCard={(u) => ({
            title: (
              <span>
                {u.username}
                {u.id === currentUser?.id && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    tú
                  </Tag>
                )}
              </span>
            ),
            subtitle: u.fullName,
            tags: (
              <>
                <Tag style={{ textTransform: 'capitalize' }}>{u.roleName}</Tag>
                {u.isActive ? <Tag color="success">Activo</Tag> : <Tag>Inactivo</Tag>}
              </>
            ),
            actions: (
              <>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(u)}>
                  Editar
                </Button>
                <Button size="small" icon={<KeyOutlined />} onClick={() => openReset(u)}>
                  Contraseña
                </Button>
                {u.id !== currentUser?.id && (
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => confirmDelete(u)}
                  >
                    Eliminar
                  </Button>
                )}
              </>
            ),
          })}
          pagination={{
            current: page,
            pageSize: limit,
            total: users.data?.meta.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `${total} usuarios`,
            onChange: (p, l) => {
              setPage(p);
              setLimit(l);
            },
          }}
        />
      </Card>

      <UserFormModal
        open={modalOpen}
        user={editing}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
