import { useEffect, useState } from 'react';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button, Form, Input, Modal, Switch, Upload } from 'antd';
import type { CarBrand } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import { uploadImage } from '../../api/uploads.api';
import { ImageCropModal } from '../../components/ImageCropModal';
import { useCreateCarBrand, useUpdateCarBrand } from '../../hooks/useCarBrands';

/** Lee un archivo como data URL (para pasarlo al recortador). */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface Props {
  open: boolean;
  brand: CarBrand | null;
  onClose: () => void;
}

export function CarBrandFormModal({ open, brand, onClose }: Props) {
  const [form] = Form.useForm<{ name: string; abbreviation?: string; isActive?: boolean }>();
  const { message } = App.useApp();
  const isEdit = brand != null;

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const createBrand = useCreateCarBrand();
  const updateBrand = useUpdateCarBrand();

  const onPickFile = async (file: File) => {
    try {
      setCropSrc(await readAsDataUrl(file));
    } catch {
      message.error('No se pudo leer la imagen');
    }
  };

  const onCropped = async (blob: Blob) => {
    setUploading(true);
    try {
      const file = new File([blob], 'logo.png', { type: 'image/png' });
      const url = await uploadImage(file);
      setLogoUrl(url);
      setCropSrc(null);
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo subir el logo'));
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (isEdit && brand) {
      form.setFieldsValue({
        name: brand.name,
        abbreviation: brand.abbreviation ?? undefined,
        isActive: brand.isActive,
      });
      setLogoUrl(brand.logoUrl);
    } else {
      form.resetFields();
      form.setFieldsValue({ isActive: true });
      setLogoUrl(null);
    }
  }, [open, isEdit, brand, form]);

  const submitting = createBrand.isPending || updateBrand.isPending;

  const handleOk = async () => {
    const values = await form.validateFields();
    const input = {
      name: values.name.trim(),
      abbreviation: values.abbreviation?.trim().toUpperCase() || undefined,
      logoUrl: logoUrl ?? undefined,
      isActive: values.isActive,
    };
    try {
      if (isEdit && brand) {
        await updateBrand.mutateAsync({ id: brand.id, input });
        message.success('Marca actualizada');
      } else {
        await createBrand.mutateAsync(input);
        message.success('Marca creada');
      }
      onClose();
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo guardar la marca'));
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'Editar marca' : 'Nueva marca de vehículo'}
      onCancel={onClose}
      onOk={handleOk}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={submitting}
      destroyOnClose
      maskClosable={false}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item label="Logo">
          <Upload
            listType="picture-card"
            showUploadList={false}
            accept="image/*"
            beforeUpload={(file) => {
              void onPickFile(file);
              return false; // no auto-subir: primero se recorta
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="logo" style={{ width: '100%', objectFit: 'contain' }} />
            ) : (
              <div>
                {uploading ? <LoadingOutlined /> : <PlusOutlined />}
                <div style={{ marginTop: 8 }}>Subir</div>
              </div>
            )}
          </Upload>
          {logoUrl && (
            <Button type="link" danger size="small" onClick={() => setLogoUrl(null)}>
              Quitar logo
            </Button>
          )}
        </Form.Item>

        <Form.Item
          name="name"
          label="Nombre de la marca"
          rules={[{ required: true, message: 'Ingresa el nombre' }]}
        >
          <Input placeholder="Volkswagen" />
        </Form.Item>

        <Form.Item
          name="abbreviation"
          label="Abreviatura (para el SKU)"
          extra="Ej. Volkswagen → VW."
        >
          <Input placeholder="VW" maxLength={10} style={{ textTransform: 'uppercase' }} />
        </Form.Item>

        {isEdit && (
          <Form.Item name="isActive" label="Activa" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
      </Form>

      <ImageCropModal
        open={cropSrc != null}
        src={cropSrc}
        loading={uploading}
        onCancel={() => setCropSrc(null)}
        onConfirm={onCropped}
      />
    </Modal>
  );
}
