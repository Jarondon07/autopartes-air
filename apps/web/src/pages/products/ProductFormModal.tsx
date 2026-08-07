import { useEffect } from 'react';
import {
  App,
  AutoComplete,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Switch,
} from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import type { CreateProductInput, UpdateProductInput } from '@autopartes-air/shared';
import { buildProductSku } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import { createBrand } from '../../api/catalogs.api';
import { categoryOptions } from '../../lib/categories';
import { useBrands, useCategories } from '../../hooks/useCatalogs';
import { useCarBrands, useCarModels } from '../../hooks/useCarBrands';
import {
  useCreateProduct,
  useProduct,
  useUpdateProduct,
} from '../../hooks/useProducts';

interface Props {
  open: boolean;
  productId: number | null;
  onClose: () => void;
}

interface FormValues {
  name: string;
  categoryId?: number;
  brand?: string; // marca del repuesto (texto libre)
  carBrandId?: number;
  carModelIds?: number[];
  yearFrom?: number;
  yearTo?: number;
  partNumber: string;
  markupPct: number;
  stock: number;
  minStock: number;
  location?: string;
  shortDescription?: string;
  description?: string;
  isActive?: boolean;
}

function blankToUndefined(v?: string) {
  const t = v?.trim();
  return t ? t : undefined;
}

const FICHA_TEMPLATE = '• Material: ';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR + 1 - 1990 + 1 }, (_, i) => {
  const y = CURRENT_YEAR + 1 - i;
  return { value: y, label: String(y) };
});

export function ProductFormModal({ open, productId, onClose }: Props) {
  const [form] = Form.useForm<FormValues>();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const isEdit = productId != null;

  const categories = useCategories();
  const brands = useBrands();
  const carBrands = useCarBrands();
  const detail = useProduct(open && isEdit ? productId : null);

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const carBrandId = Form.useWatch('carBrandId', form);
  const carModels = useCarModels(carBrandId ?? null);

  useEffect(() => {
    if (!open) return;
    if (isEdit && detail.data) {
      const brandName = brands.data?.find((b) => b.id === detail.data!.brandId)?.name;
      form.setFieldsValue({
        name: detail.data.name,
        categoryId: detail.data.categoryId ?? undefined,
        brand: brandName,
        carBrandId: detail.data.carBrandId ?? undefined,
        carModelIds: detail.data.carModelIds,
        yearFrom: detail.data.yearFrom ?? undefined,
        yearTo: detail.data.yearTo ?? undefined,
        partNumber: detail.data.partNumber,
        markupPct: Number(detail.data.markupPct),
        stock: detail.data.stock,
        minStock: detail.data.minStock,
        location: detail.data.location ?? undefined,
        shortDescription: detail.data.shortDescription ?? undefined,
        description: detail.data.description ?? undefined,
        isActive: detail.data.isActive,
      });
    }
    if (!isEdit) {
      form.resetFields();
      form.setFieldsValue({ markupPct: 30, stock: 0, minStock: 0, description: FICHA_TEMPLATE });
    }
  }, [open, isEdit, detail.data, brands.data, form]);

  // SKU en vivo = [abrev. categoría][abrev. marca carro]-[nº pieza].
  const categoryId = Form.useWatch('categoryId', form);
  const partNumber = Form.useWatch('partNumber', form);
  const catAbbr = categories.data?.find((c) => c.id === categoryId)?.abbreviation;
  const carAbbr = carBrands.data?.find((b) => b.id === carBrandId)?.abbreviation;
  const codePreview = partNumber?.trim()
    ? buildProductSku(catAbbr, carAbbr, partNumber)
    : '(se genera con categoría, marca del carro y número de pieza)';

  const submitting = createProduct.isPending || updateProduct.isPending;

  const resolveBrandId = async (raw?: string): Promise<number | undefined> => {
    const name = raw?.trim();
    if (!name) return undefined;
    const existing = brands.data?.find((b) => b.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;
    const created = await createBrand({ name });
    qc.invalidateQueries({ queryKey: ['brands'] });
    return created.id;
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    const brandId = await resolveBrandId(values.brand);
    const base = {
      name: values.name.trim(),
      partNumber: values.partNumber.trim(),
      categoryId: values.categoryId,
      brandId,
      carBrandId: values.carBrandId,
      carModelIds: values.carModelIds ?? [],
      yearFrom: values.yearFrom ?? undefined,
      yearTo: values.yearTo ?? undefined,
      markupPct: values.markupPct,
      minStock: values.minStock,
      location: blankToUndefined(values.location),
      shortDescription: blankToUndefined(values.shortDescription),
      description: blankToUndefined(values.description),
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
      width={780}
      destroyOnClose
      maskClosable={false}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item
          name="name"
          label="Nombre"
          rules={[
            { required: true, message: 'Ingresa el nombre' },
            { min: 2, message: 'Mínimo 2 caracteres' },
          ]}
        >
          <Input placeholder="Evaporador VW Fox / CrossFox (2005-2010) 1.6L" />
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
                options={categoryOptions(categories.data ?? [])}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="brand"
              label="Marca del repuesto"
              extra="Si no existe, se registra como nueva."
            >
              <AutoComplete
                allowClear
                placeholder="Denso, Sanden, Valeo…"
                options={(brands.data ?? []).map((b) => ({ value: b.name }))}
                filterOption={(input, option) =>
                  (option?.value ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="carBrandId" label="Marca del carro (para qué carro sirve)">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Seleccionar marca"
                loading={carBrands.isLoading}
                onChange={() => form.setFieldsValue({ carModelIds: [] })}
                options={(carBrands.data ?? []).map((b) => ({ value: b.id, label: b.name }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="carModelIds" label="Modelos (para cuáles sirve)">
              <Select
                mode="multiple"
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder={carBrandId ? 'Seleccionar modelos' : 'Elige primero la marca'}
                disabled={!carBrandId}
                loading={carModels.isLoading}
                options={(carModels.data ?? []).map((m) => ({ value: m.id, label: m.name }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="yearFrom" label="Año desde">
              <Select allowClear showSearch placeholder="—" options={YEAR_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="yearTo" label="Año hasta">
              <Select allowClear showSearch placeholder="—" options={YEAR_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="partNumber"
              label="Número de pieza"
              rules={[{ required: true, message: 'Ingresa el número de pieza' }]}
            >
              <Input placeholder="905" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Código (SKU)"
          extra="Formato: [abrev. categoría][abrev. marca del carro]-[nº pieza]. Se genera automáticamente."
        >
          <Input value={codePreview} disabled />
        </Form.Item>

         <Form.Item name="shortDescription" label="Descripción corta" extra="Resumen de 1 línea.">
          <Input maxLength={255} showCount placeholder="Serpentín de aluminio para sistema R134a." />
        </Form.Item>

        <Form.Item name="description" label="Ficha técnica">
          <Input.TextArea rows={5} maxLength={5000} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="markupPct"
              label="Margen de ganancia (%)"
              rules={[{ required: true, message: 'Ingresa el margen' }]}
            >
              <InputNumber min={0} max={999.99} step={1} precision={2} style={{ width: '100%' }} suffix="%" />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item label="Costo y precio de venta">
              <Input
                disabled
                value="El costo se registra con la compra; el precio se calcula con costo + margen + IVA."
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="stock" label={isEdit ? 'Stock (ajustar en Inventario)' : 'Stock inicial'}>
              <InputNumber min={0} style={{ width: '100%' }} disabled={isEdit} />
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

        {isEdit && (
          <Form.Item name="isActive" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
