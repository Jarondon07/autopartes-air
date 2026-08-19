import { useEffect, useState } from 'react';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  App,
  AutoComplete,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Switch,
  Typography,
} from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { CreateProductInput, UpdateProductInput } from '@autopartes-air/shared';
import { UNIVERSAL_CAR_ABBR, buildProductSku } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import { createBrand } from '../../api/catalogs.api';
import { ProductImagesInput } from '../../components/ProductImagesInput';
import { PercentInput, QuantityInput } from '../../components/NumberInputs';
import { categoryOptions } from '../../lib/categories';
import { useBrands, useCategories } from '../../hooks/useCatalogs';
import { useCarBrands, useCarModels } from '../../hooks/useCarBrands';
import { useWarehouses } from '../../hooks/useWarehouses';
import { useIsMobile } from '../../hooks/useResponsive';
import {
  useCreateProduct,
  useProduct,
  useUpdateProduct,
} from '../../hooks/useProducts';

const { Title, Text } = Typography;

/** Una fila de modelo compatible: el modelo y su rango de años propio. */
interface CarModelRow {
  carModelId?: number;
  yearFrom?: number | null;
  yearTo?: number | null;
}

interface FormValues {
  name: string;
  categoryIds?: number[];
  brand?: string;
  carBrandId?: number;
  carModels?: CarModelRow[];
  partNumber: string;
  markupPct: number;
  minStock: number;
  warehouseId?: number;
  shortDescription?: string;
  description?: string;
  isActive?: boolean;
}

function blankToUndefined(v?: string) {
  const t = v?.trim();
  return t ? t : undefined;
}

const FICHA_TEMPLATE = '• Material: ';

/**
 * Valor del select de marca de carro que representa "sirve para todos".
 * Es un centinela de UI: al guardar se traduce a `isUniversal: true` con
 * `carBrandId: null`, para no ensuciar el catálogo de marcas con una entrada
 * falsa llamada "Todas".
 */
const UNIVERSAL_CAR_BRAND = -1;

/** Etiqueta legible por campo, para el resumen de validación. */
const FIELD_LABELS: Record<string, string> = {
  name: 'Nombre',
  categoryIds: 'Categorías',
  brand: 'Marca del repuesto',
  carBrandId: 'Marca del carro',
  partNumber: 'Número de pieza',
  carModels: 'Modelos compatibles',
  markupPct: 'Margen de ganancia',
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR + 1 - 1990 + 1 }, (_, i) => {
  const y = CURRENT_YEAR + 1 - i;
  return { value: y, label: String(y) };
});

export function ProductFormPage() {
  const isMobile = useIsMobile();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const isEdit = id != null;
  const productId = id ? Number(id) : null;

  const categories = useCategories();
  const brands = useBrands();
  const carBrands = useCarBrands();
  const warehouses = useWarehouses();
  const detail = useProduct(isEdit ? productId : null);

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const carBrandId = Form.useWatch('carBrandId', form);
  /** Producto universal (gas, aceites): sin marca ni modelos de carro. */
  const isUniversal = carBrandId === UNIVERSAL_CAR_BRAND;
  const carModels = useCarModels(isUniversal ? null : carBrandId ?? null);
  const selectedModels = Form.useWatch('carModels', form);
  const [images, setImages] = useState<string[]>([]);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  /** Opciones de modelo para una fila, deshabilitando los ya elegidos en otras filas. */
  const modelOptionsFor = (rowName: number) => {
    const usedIds = new Set(
      (selectedModels ?? [])
        .filter((_, i) => i !== rowName)
        .map((m) => m?.carModelId)
        .filter((v): v is number => v != null),
    );
    return (carModels.data ?? []).map((m) => ({
      value: m.id,
      label: m.name,
      disabled: usedIds.has(m.id),
    }));
  };

  useEffect(() => {
    if (isEdit && detail.data) {
      const brandName = brands.data?.find((b) => b.id === detail.data!.brandId)?.name;
      form.setFieldsValue({
        name: detail.data.name,
        categoryIds: detail.data.categoryIds,
        brand: brandName,
        carBrandId: detail.data.isUniversal
          ? UNIVERSAL_CAR_BRAND
          : detail.data.carBrandId ?? undefined,
        carModels: detail.data.carModels.map((m) => ({
          carModelId: m.carModelId,
          yearFrom: m.yearFrom ?? undefined,
          yearTo: m.yearTo ?? undefined,
        })),
        partNumber: detail.data.partNumber,
        markupPct: Number(detail.data.markupPct),
        minStock: detail.data.minStock,
        warehouseId: detail.data.warehouseId ?? undefined,
        shortDescription: detail.data.shortDescription ?? undefined,
        description: detail.data.description ?? undefined,
        isActive: detail.data.isActive,
      });
      setImages(detail.data.images ?? []);
    }
  }, [isEdit, detail.data, brands.data, form]);

  useEffect(() => {
    if (!isEdit) {
      form.setFieldsValue({ markupPct: 30, minStock: 0, description: FICHA_TEMPLATE });
    }
  }, [isEdit, form]);

  const categoryIds = Form.useWatch('categoryIds', form);
  const partNumber = Form.useWatch('partNumber', form);
  const primaryCategoryId = categoryIds?.[0];
  const catAbbr = categories.data?.find((c) => c.id === primaryCategoryId)?.abbreviation;
  const carAbbr = isUniversal
    ? UNIVERSAL_CAR_ABBR
    : carBrands.data?.find((b) => b.id === carBrandId)?.abbreviation;
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

  const onSubmit = async () => {
    let values: FormValues;
    try {
      values = await form.validateFields();
      setMissingFields([]);
    } catch (e) {
      const fields = (e as { errorFields?: { name: (string | number)[] }[] }).errorFields ?? [];
      const labels = Array.from(
        new Set(fields.map((f) => FIELD_LABELS[String(f.name[0])] ?? String(f.name[0]))),
      );
      setMissingFields(labels);
      if (fields[0]) form.scrollToField(fields[0].name, { behavior: 'smooth', block: 'center' });
      message.error('Faltan campos por completar.');
      return;
    }
    const brandId = await resolveBrandId(values.brand);
    const base = {
      name: values.name.trim(),
      partNumber: values.partNumber.trim(),
      categoryIds: values.categoryIds ?? [],
      brandId,
      carBrandId: isUniversal ? null : values.carBrandId,
      isUniversal,
      carModels: isUniversal
        ? []
        : (values.carModels ?? [])
            .filter((m) => m.carModelId != null)
            .map((m) => ({
              carModelId: m.carModelId!,
              yearFrom: m.yearFrom ?? null,
              yearTo: m.yearTo ?? null,
            })),
      markupPct: values.markupPct,
      minStock: values.minStock,
      warehouseId: values.warehouseId ?? null,
      shortDescription: blankToUndefined(values.shortDescription),
      description: blankToUndefined(values.description),
      images,
    };

    try {
      if (isEdit && productId) {
        const input: UpdateProductInput = { ...base, isActive: values.isActive };
        await updateProduct.mutateAsync({ id: productId, input });
        message.success('Producto actualizado');
      } else {
        // El stock no se fija aquí: nace en 0 y entra con la compra o un ajuste.
        const input: CreateProductInput = base;
        await createProduct.mutateAsync(input);
        message.success('Producto creado');
      }
      navigate('/productos');
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo guardar el producto'));
    }
  };

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <Space align="center" wrap style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/productos')} />
        <Title level={3} style={{ margin: 0 }}>
          <strong>{isEdit ? 'Editar producto' : 'Nuevo producto'}</strong>
        </Title>
      </Space>

      <Form form={form} layout="vertical" scrollToFirstError>
        {missingFields.length > 0 && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message="Faltan campos por completar"
            description={`Completa: ${missingFields.join(', ')}.`}
          />
        )}

        <Card title="Información general" style={{ marginBottom: 16 }}>
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
            <Col xs={24} md={12}>
              <Form.Item
                name="categoryIds"
                label="Categorías"
                extra="La primera define el SKU. Puedes elegir varias."
                rules={[{ required: true, message: 'Selecciona al menos una categoría' }]}
              >
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Seleccionar"
                  loading={categories.isLoading}
                  options={categoryOptions(categories.data ?? [])}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="brand"
                label="Marca del repuesto"
                extra="Si no existe, se registra como nueva."
                rules={[{ required: true, message: 'Ingresa la marca del repuesto' }]}
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
            <Col xs={24} md={12}>
              <Form.Item
                name="carBrandId"
                label="Marca del carro (para qué carro sirve)"
                rules={[{ required: true, message: 'Selecciona la marca del carro' }]}
              >
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Seleccionar marca"
                  loading={carBrands.isLoading}
                  onChange={() => form.setFieldsValue({ carModels: [] })}
                  options={[
                    {
                      value: UNIVERSAL_CAR_BRAND,
                      label: 'Todas las marcas (universal)',
                    },
                    ...(carBrands.data ?? []).map((b) => ({ value: b.id, label: b.name })),
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
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
            label="Modelos compatibles (cada uno con su rango de años)"
            style={{ marginBottom: 0 }}
          >
            {isUniversal && (
              <Alert
                type="success"
                showIcon
                style={{ marginBottom: 8 }}
                message="Todos los modelos"
                description="Este producto sirve para cualquier vehículo, así que no lleva marca ni modelos. Aparecerá al buscar por cualquier marca o modelo en el cajero."
              />
            )}
            <Form.List
              name="carModels"
              rules={[
                {
                  validator: async (_, models) => {
                    // Un universal no lleva modelos: la regla no aplica.
                    if (isUniversal) return Promise.resolve();
                    if (!models || models.length < 1) {
                      return Promise.reject(new Error('Agrega al menos un modelo compatible'));
                    }
                  },
                },
              ]}
            >
              {(fields, { add, remove }, { errors }) => (
                <>
                  {(isUniversal ? [] : fields).map((field) => (
                    <Row gutter={12} key={field.key} align="top" wrap={false}>
                      <Col flex="auto">
                        <Form.Item
                          name={[field.name, 'carModelId']}
                          rules={[{ required: true, message: 'Elige el modelo' }]}
                          style={{ marginBottom: 8 }}
                        >
                          <Select
                            showSearch
                            optionFilterProp="label"
                            placeholder="Modelo"
                            loading={carModels.isLoading}
                            options={modelOptionsFor(field.name)}
                          />
                        </Form.Item>
                      </Col>
                      <Col flex="130px">
                        <Form.Item name={[field.name, 'yearFrom']} style={{ marginBottom: 8 }}>
                          <Select allowClear showSearch placeholder="Año desde" options={YEAR_OPTIONS} />
                        </Form.Item>
                      </Col>
                      <Col flex="130px">
                        <Form.Item
                          name={[field.name, 'yearTo']}
                          dependencies={[['carModels', field.name, 'yearFrom']]}
                          style={{ marginBottom: 8 }}
                          rules={[
                            ({ getFieldValue }) => ({
                              validator(_, value) {
                                const from = getFieldValue(['carModels', field.name, 'yearFrom']);
                                if (value == null || from == null || value >= from) {
                                  return Promise.resolve();
                                }
                                return Promise.reject(new Error('"Hasta" ≥ "desde"'));
                              },
                            }),
                          ]}
                        >
                          <Select allowClear showSearch placeholder="Año hasta" options={YEAR_OPTIONS} />
                        </Form.Item>
                      </Col>
                      <Col flex="32px">
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => remove(field.name)}
                          title="Quitar modelo"
                        />
                      </Col>
                    </Row>
                  ))}
                  {!isUniversal && (
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => add({})}
                      disabled={!carBrandId}
                      block
                    >
                      Agregar modelo
                    </Button>
                  )}
                  {!carBrandId && (
                    <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                      Elige primero la marca del carro.
                    </Text>
                  )}
                  <Form.ErrorList errors={errors} />
                </>
              )}
            </Form.List>
          </Form.Item>

          <Form.Item
            label="Código (SKU)"
            extra={`Formato: [abrev. categoría][abrev. marca del carro]-[nº pieza]. Se genera automáticamente.${
              isUniversal ? ` En los universales la marca es ${UNIVERSAL_CAR_ABBR}.` : ''
            }`}
          >
            <Input value={codePreview} disabled />
          </Form.Item>
        </Card>

        <Card title="Precio e inventario" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="markupPct"
                label="Margen de ganancia (%)"
                rules={[{ required: true, message: 'Ingresa el margen' }]}
              >
                <PercentInput />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item label="Costo y precio de venta">
                <Input
                  disabled
                  value="El costo se registra con la compra; el precio = costo + margen + IVA."
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="minStock"
                label="Stock mínimo"
                extra="Aviso de stock bajo. Las existencias entran por Compras o por un ajuste en Inventario."
              >
                <QuantityInput />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="warehouseId" label="Almacén">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Seleccionar almacén"
                  loading={warehouses.isLoading}
                  options={(warehouses.data ?? [])
                    .filter((w) => w.isActive)
                    .map((w) => ({ value: w.id, label: w.name }))}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Descripciones" style={{ marginBottom: 16 }}>
          <Form.Item name="shortDescription" label="Descripción corta" extra="Resumen de 1 línea.">
            <Input maxLength={255} showCount placeholder="Serpentín de aluminio para sistema R134a." />
          </Form.Item>
          <Form.Item name="description" label="Ficha técnica">
            <Input.TextArea rows={5} maxLength={5000} />
          </Form.Item>
        </Card>

        <Card title="Imágenes (máx. 10)" style={{ marginBottom: 16 }}>
          <ProductImagesInput value={images} onChange={setImages} max={10} />
        </Card>

        {isEdit && (
          <Card style={{ marginBottom: 16 }}>
            <Form.Item name="isActive" label="Activo" valuePropName="checked" style={{ margin: 0 }}>
              <Switch />
            </Form.Item>
          </Card>
        )}

        <Space
          style={{ justifyContent: 'flex-end', width: '100%' }}
          direction={isMobile ? 'vertical' : 'horizontal'}
          styles={{ item: { width: isMobile ? '100%' : 'auto' } }}
        >
          <Button block={isMobile} onClick={() => navigate('/productos')}>
            Cancelar
          </Button>
          <Button block={isMobile} type="primary" loading={submitting} onClick={onSubmit}>
            Guardar
          </Button>
        </Space>
      </Form>
    </div>
  );
}
