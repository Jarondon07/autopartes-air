import { useMemo, useState } from 'react';
import {
  CheckCircleOutlined,
  EditOutlined,
  EyeOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Image,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { PERMISSIONS, formatUsd } from '@autopartes-air/shared';
import type { ProductRow } from '../../api/products.api';
import { getApiErrorMessage } from '../../api/client';
import { categoryOptions } from '../../lib/categories';
import { useBrands, useCategories } from '../../hooks/useCatalogs';
import { useProduct, useProducts, useUpdateProduct } from '../../hooks/useProducts';
import { useAuthStore } from '../../stores/auth.store';

const { Title, Text } = Typography;

interface Filters {
  page: number;
  limit: number;
  q?: string;
  categoryId?: number;
  brandId?: number;
}

export function ProductsPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission(PERMISSIONS.PRODUCTS_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.PRODUCTS_UPDATE);

  const [filters, setFilters] = useState<Filters>({ page: 1, limit: 20 });
  const [previewId, setPreviewId] = useState<number | null>(null);

  const products = useProducts(filters);
  const categories = useCategories();
  const brands = useBrands();
  const updateProduct = useUpdateProduct();
  const preview = useProduct(previewId);

  const categoryMap = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c.name])),
    [categories.data],
  );
  const brandMap = useMemo(
    () => new Map((brands.data ?? []).map((b) => [b.id, b.name])),
    [brands.data],
  );

  const openCreate = () => navigate('/productos/nuevo');
  const openEdit = (id: number) => navigate(`/productos/${id}/editar`);

  const toggleActive = async (product: ProductRow) => {
    try {
      await updateProduct.mutateAsync({ id: product.id, input: { isActive: !product.isActive } });
      message.success(product.isActive ? 'Producto desactivado' : 'Producto activado');
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo cambiar el estado'));
    }
  };

  const columns: ColumnsType<ProductRow> = [
    {
      title: '',
      dataIndex: 'primaryImageUrl',
      width: 56,
      render: (url: string | null) => (
        <Avatar shape="square" size={40} src={url ?? undefined} icon={<PictureOutlined />} />
      ),
    },
    {
      title: 'Código',
      dataIndex: 'code',
      width: 130,
      render: (code: string) => <Text strong>{code}</Text>,
    },
    { title: 'Nombre', dataIndex: 'name' },
    {
      title: 'Categoría',
      dataIndex: 'categoryId',
      width: 140,
      render: (id: number | null) => (id ? (categoryMap.get(id) ?? '—') : '—'),
    },
    {
      title: 'Precio',
      dataIndex: 'priceUsd',
      width: 110,
      align: 'right',
      render: (v: string) => <Text strong>{formatUsd(Number(v))}</Text>,
    },
    {
      title: 'Stock',
      dataIndex: 'stock',
      width: 100,
      align: 'center',
      render: (stock: number, row) => {
        const low = stock <= row.minStock;
        return (
          <Tag color={low ? 'error' : 'default'}>
            {stock.toLocaleString('es-VE')}
            {low ? ' ⚠' : ''}
          </Tag>
        );
      },
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      width: 100,
      render: (active: boolean) =>
        active ? <Tag color="success">Activo</Tag> : <Tag>Inactivo</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 130,
      fixed: 'right',
      render: (_, product) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => setPreviewId(product.id)}
            title="Vista previa"
          />
          {canUpdate && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEdit(product.id)}
              title="Editar"
            />
          )}
          {canUpdate && (
            <Button
              type="text"
              icon={
                product.isActive ? (
                  <StopOutlined style={{ color: '#fa8c16' }} />
                ) : (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                )
              }
              onClick={() => toggleActive(product)}
              title={product.isActive ? 'Desactivar' : 'Activar'}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            <strong>Productos</strong>
          </Title>
          <Text type="secondary">Catálogo de repuestos</Text>
        </Col>
        {canCreate && (
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Nuevo producto
            </Button>
          </Col>
        )}
      </Row>

      <Card>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={10}>
            <Input.Search
              allowClear
              placeholder="Buscar por código o nombre"
              onSearch={(q) => setFilters((f) => ({ ...f, q: q || undefined, page: 1 }))}
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              placeholder="Categoría"
              loading={categories.isLoading}
              options={categoryOptions(categories.data ?? [])}
              onChange={(categoryId) => setFilters((f) => ({ ...f, categoryId, page: 1 }))}
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              placeholder="Marca"
              loading={brands.isLoading}
              options={(brands.data ?? []).map((b) => ({ value: b.id, label: b.name }))}
              onChange={(brandId) => setFilters((f) => ({ ...f, brandId, page: 1 }))}
            />
          </Col>
          <Col xs={24} md={2}>
            <Button icon={<ReloadOutlined />} onClick={() => products.refetch()} block />
          </Col>
        </Row>

        <Table<ProductRow>
          rowKey="id"
          columns={columns}
          dataSource={products.data?.data ?? []}
          loading={products.isLoading}
          scroll={{ x: 900 }}
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total: products.data?.meta.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `${total} productos`,
            onChange: (page, limit) => setFilters((f) => ({ ...f, page, limit })),
          }}
        />
      </Card>

      <Drawer
        open={previewId != null}
        onClose={() => setPreviewId(null)}
        title="Vista previa del producto"
        width={560}
        loading={preview.isLoading}
      >
        {preview.data && (
          <>
            {preview.data.images.length > 0 ? (
              <Image.PreviewGroup>
                <Space wrap>
                  {preview.data.images.map((url, i) => (
                    <Image
                      key={url}
                      src={url}
                      width={i === 0 ? 160 : 72}
                      height={i === 0 ? 160 : 72}
                      style={{ objectFit: 'contain', border: '1px solid #eee', borderRadius: 6 }}
                    />
                  ))}
                </Space>
              </Image.PreviewGroup>
            ) : (
              <div style={{ color: '#adb5bd', textAlign: 'center', padding: 24 }}>
                <PictureOutlined style={{ fontSize: 32 }} />
                <div>Sin imágenes</div>
              </div>
            )}

            <Descriptions column={1} size="small" style={{ marginTop: 16 }}>
              <Descriptions.Item label="Código">{preview.data.code}</Descriptions.Item>
              <Descriptions.Item label="Nombre">{preview.data.name}</Descriptions.Item>
              <Descriptions.Item label="N° de pieza">{preview.data.partNumber}</Descriptions.Item>
              <Descriptions.Item label="Categoría">
                {preview.data.categoryId ? categoryMap.get(preview.data.categoryId) ?? '—' : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Marca">
                {preview.data.brandId ? brandMap.get(preview.data.brandId) ?? '—' : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Años">
                {preview.data.yearFrom || preview.data.yearTo
                  ? `${preview.data.yearFrom ?? ''}${preview.data.yearTo ? ` - ${preview.data.yearTo}` : ''}`
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Precio">
                <Text strong>{formatUsd(Number(preview.data.priceUsd))}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Stock">
                {preview.data.stock.toLocaleString('es-VE')}
              </Descriptions.Item>
              <Descriptions.Item label="Estado">
                {preview.data.isActive ? (
                  <Tag color="success">Activo</Tag>
                ) : (
                  <Tag>Inactivo</Tag>
                )}
              </Descriptions.Item>
              {preview.data.shortDescription && (
                <Descriptions.Item label="Descripción">
                  {preview.data.shortDescription}
                </Descriptions.Item>
              )}
              {preview.data.description && (
                <Descriptions.Item label="Ficha técnica">
                  <div style={{ whiteSpace: 'pre-wrap' }}>{preview.data.description}</div>
                </Descriptions.Item>
              )}
            </Descriptions>
          </>
        )}
      </Drawer>
    </div>
  );
}
