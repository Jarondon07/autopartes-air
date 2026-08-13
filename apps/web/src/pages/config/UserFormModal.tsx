import { useEffect } from 'react';
import { App, Form, Input, Modal, Select, Switch } from 'antd';
import type { User } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import { useRoles } from '../../hooks/useRoles';
import { useCreateUser, useUpdateUser } from '../../hooks/useUsers';

interface Props {
  open: boolean;
  user: User | null;
  onClose: () => void;
}

export function UserFormModal({ open, user, onClose }: Props) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const isEdit = user != null;

  const roles = useRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  useEffect(() => {
    if (!open) return;
    if (isEdit && user) {
      form.setFieldsValue({
        username: user.username,
        fullName: user.fullName,
        roleId: user.roleId,
        isActive: user.isActive,
      });
    } else {
      form.resetFields();
    }
  }, [open, isEdit, user, form]);

  const submitting = createUser.isPending || updateUser.isPending;

  const handleOk = async () => {
    const values = await form.validateFields();
    try {
      if (isEdit && user) {
        await updateUser.mutateAsync({
          id: user.id,
          input: {
            fullName: values.fullName.trim(),
            roleId: values.roleId,
            isActive: values.isActive,
          },
        });
        message.success('Usuario actualizado');
      } else {
        await createUser.mutateAsync({
          username: values.username.trim(),
          password: values.password,
          fullName: values.fullName.trim(),
          roleId: values.roleId,
        });
        message.success('Usuario creado');
      }
      onClose();
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo guardar el usuario'));
    }
  };

  const roleOptions = (roles.data ?? []).map((r) => ({
    value: r.id,
    label: r.name.charAt(0).toUpperCase() + r.name.slice(1),
  }));

  return (
    <Modal
      open={open}
      title={isEdit ? 'Editar usuario' : 'Nuevo usuario'}
      onCancel={onClose}
      onOk={handleOk}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={submitting}
      destroyOnHidden
      maskClosable={false}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item
          name="username"
          label="Usuario"
          rules={[
            { required: true, message: 'Ingresa el usuario' },
            { min: 3, message: 'Mínimo 3 caracteres' },
            {
              pattern: /^[a-z0-9._-]+$/i,
              message: 'Solo letras, números, punto, guion y guion bajo',
            },
          ]}
        >
          <Input placeholder="jperez" disabled={isEdit} autoComplete="off" />
        </Form.Item>

        {!isEdit && (
          <Form.Item
            name="password"
            label="Contraseña"
            rules={[
              { required: true, message: 'Ingresa la contraseña' },
              { min: 6, message: 'Mínimo 6 caracteres' },
            ]}
          >
            <Input.Password placeholder="••••••••" autoComplete="new-password" />
          </Form.Item>
        )}

        <Form.Item
          name="fullName"
          label="Nombre completo"
          rules={[
            { required: true, message: 'Ingresa el nombre' },
            { min: 3, message: 'Mínimo 3 caracteres' },
          ]}
        >
          <Input placeholder="Juan Pérez" />
        </Form.Item>

        <Form.Item
          name="roleId"
          label="Rol"
          rules={[{ required: true, message: 'Selecciona un rol' }]}
        >
          <Select
            placeholder="Seleccionar rol"
            loading={roles.isLoading}
            options={roleOptions}
          />
        </Form.Item>

        {isEdit && (
          <Form.Item name="isActive" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
