import { useEffect } from 'react';
import {
  App,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Switch,
} from 'antd';
import type {
  CreateProductInput,
  UpdateProductInput,
} from '@autopartes-air/shared';
import { calcPriceUsd, formatUsd } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import { useBrands, useCategories, useVehicles } from '../../hooks/useCatalogs';
import {
  useCreateProduct,
  useProduct,
  useUpdateProduct,
} from '../../hooks/useProducts';

interface Props {
  open: boolean;
  /** null → crear; number → editar ese producto. */
  productId: number | null;
  onClose: () => void;
}

interface FormValues {
  code: string;
  name: string;
  description?: string;
  categoryId?: number;
  brandId?: number;
  costUsd: number;
  markupPct: number;
  stock: number;
  minStock: number;
  location?: string;
  vehicleIds?: number[];
  isActive?: boolean;
}

/** Convierte '' a undefined para campos opcionales de texto. */
function blankToUndefined(v?: string) {
  const trimmed = v?.trim();
  return trimmed ? trimmed : undefined;
}

export function ProductFormModal({ open, productId, onClose }: Props) {
  const [form] = Form.useForm<FormValues>();
  const { message } = App.useApp();
  const isEdit = productId != null;

  const categories = useCategories();
  const brands = useBrands();
  const vehicles = useVehicles();
  const detail = useProduct(open && isEdit ? productId : null);

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  // Precarga del formulario al abrir en modo edición o reset al crear.
  useEffect(() => {
    if (!open) return;
    if (isEdit && detail.data) {
      form.setFieldsValue({
        code: detail.data.code,
        name: detail.data.name,
        description: detail.data.description ?? undefined,
        categoryId: detail.data.categoryId ?? undefined,
        brandId: detail.data.brandId ?? undefined,
        costUsd: Number(detail.data.costUsd),
        markupPct: Number(detail.data.markupPct),
        stock: detail.data.stock,
        minStock: detail.data.minStock,
        location: detail.data.location ?? undefined,
        vehicleIds: detail.data.vehicleIds,
        isActive: detail.data.isActive,
      });
    }
    if (!isEdit) {
      form.resetFields();
      form.setFieldsValue({ markupPct: 30, stock: 0, minStock: 0 });
    }
  }, [open, isEdit, detail.data, form]);

  const costUsd = Form.useWatch('costUsd', form) ?? 0;
  const markupPct = Form.useWatch('markupPct', form) ?? 0;
  const priceUsd = calcPriceUsd(Number(costUsd), Number(markupPct));

  const submitting = createProduct.isPending || updateProduct.isPending;

  const handleOk = async () => {
    const values = await form.validateFields();
    const base = {
      code: values.code,
      name: values.name,
      description: blankToUndefined(values.description),
      categoryId: values.categoryId,
      brandId: values.brandId,
      costUsd: values.costUsd,
      markupPct: values.markupPct,
      minStock: values.minStock,
      location: blankToUndefined(values.location),
      vehicleIds: values.vehicleIds ?? [],
    };

    try {
      if (isEdit) {
        const input: UpdateProductInput = { ...base, isActive: values.isActive };
        await updateProduct.mutateAsync({ id: productId, input });
        message.success('Producto actualizado');
      } else {
        const input: CreateProductInput = { ...base, stock: values.stock };
        await createProduct.mutateAsync(input);
        message.success('Producto creado');
      }
      onClose();
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo guardar el producto'));
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'Editar producto' : 'Nuevo producto'}
      onCancel={onClose}
      onOk={handleOk}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={submitting}
      width={720}
      destroyOnClose
      maskClosable={false}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="code"
              label="Código"
              rules={[{ required: true, message: 'Ingresa el código' }]}
            >
              <Input placeholder="FRN-001" />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item
              name="name"
              label="Nombre"
              rules={[
                { required: true, message: 'Ingresa el nombre' },
                { min: 2, message: 'Mínimo 2 caracteres' },
              ]}
            >
              <Input placeholder="Pastilla de freno delantera" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="Descripción">
          <Input.TextArea rows={2} maxLength={1000} placeholder="Opcional" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="categoryId" label="Categoría">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Seleccionar"
                loading={categories.isLoading}
                options={(categories.data ?? []).map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="brandId" label="Marca">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Seleccionar"
                loading={brands.isLoading}
                options={(brands.data ?? []).map((b) => ({
                  value: b.id,
                  label: b.name,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="costUsd"
              label="Costo (USD)"
              rules={[{ required: true, message: 'Ingresa el costo' }]}
            >
              <InputNumber
                min={0}
                step={0.01}
                precision={2}
                style={{ width: '100%' }}
                prefix="$"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="markupPct"
              label="Markup (%)"
              rules={[{ required: true, message: 'Ingresa el markup' }]}
            >
              <InputNumber
                min={0}
                max={999.99}
                step={1}
                precision={2}
                style={{ width: '100%' }}
                suffix="%"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Precio de venta">
              <Input value={formatUsd(priceUsd)} disabled />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="stock"
              label={isEdit ? 'Stock (ajustar en Inventario)' : 'Stock inicial'}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                disabled={isEdit}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="minStock" label="Stock mínimo">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="location" label="Ubicación">
              <Input placeholder="Pasillo 3 - B" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="vehicleIds" label="Vehículos compatibles">
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Seleccionar vehículos"
            loading={vehicles.isLoading}
            options={(vehicles.data ?? []).map((v) => ({
              value: v.id,
              label: `${v.make} ${v.model}${
                v.yearFrom ? ` (${v.yearFrom}${v.yearTo ? `-${v.yearTo}` : ''})` : ''
              }`,
            }))}
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
