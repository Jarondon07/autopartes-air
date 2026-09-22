import { useEffect } from 'react';
import { App, Form, Input, Modal, Switch } from 'antd';
import type { Category } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import { useCreateCategory, useUpdateCategory } from '../../hooks/useCatalogs';

interface Props {
  open: boolean;
  category: Category | null;
  onClose: () => void;
}

interface FormValues {
  name: string;
  abbreviation?: string;
  description?: string;
  isActive?: boolean;
}

export function CategoryFormModal({ open, category, onClose }: Props) {
  const [form] = Form.useForm<FormValues>();
  const { message } = App.useApp();
  const isEdit = category != null;

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  useEffect(() => {
    if (!open) return;
    if (isEdit && category) {
      form.setFieldsValue({
        name: category.name,
        abbreviation: category.abbreviation ?? undefined,
        description: category.description ?? undefined,
        isActive: category.isActive,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ isActive: true });
    }
  }, [open, isEdit, category, form]);

  const submitting = createCategory.isPending || updateCategory.isPending;

  const handleOk = async () => {
    const values = await form.validateFields();
    const input = {
      name: values.name.trim(),
      abbreviation: values.abbreviation?.trim().toUpperCase() || undefined,
      description: values.description?.trim() || undefined,
      isActive: values.isActive,
    };
    try {
      if (isEdit && category) {
        await updateCategory.mutateAsync({ id: category.id, input });
        message.success('Categoría actualizada');
      } else {
        await createCategory.mutateAsync(input);
        message.success('Categoría creada');
      }
      onClose();
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo guardar la categoría'));
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'Editar categoría' : 'Nueva categoría'}
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
          name="name"
          label="Nombre de la categoría"
          rules={[
            { required: true, message: 'Ingresa el nombre' },
            { min: 2, message: 'Mínimo 2 caracteres' },
          ]}
        >
          <Input placeholder="Compresores" />
        </Form.Item>

        <Form.Item
          name="abbreviation"
          label="Abreviatura (para el SKU)"
          extra="Ej. Evaporadores → EVA. Se usa al inicio del código del producto."
        >
          <Input placeholder="EVA" maxLength={10} style={{ textTransform: 'uppercase' }} />
        </Form.Item>

        <Form.Item name="description" label="Descripción">
          <Input.TextArea rows={2} maxLength={500} placeholder="Opcional" />
        </Form.Item>

        {isEdit && (
          <Form.Item name="isActive" label="Activa" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
