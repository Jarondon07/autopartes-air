import { useMemo, useState } from 'react';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Product } from '@autopartes-air/shared';
import { PERMISSIONS, formatUsd } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import { categoryOptions } from '../../lib/categories';
import { useBrands, useCategories } from '../../hooks/useCatalogs';
import { useDeleteProduct, useProducts } from '../../hooks/useProducts';
import { useAuthStore } from '../../stores/auth.store';
import { ProductFormModal } from './ProductFormModal';

const { Title, Text } = Typography;

interface Filters {
  page: number;
  limit: number;
  q?: string;
  categoryId?: number;
  brandId?: number;
}

export function ProductsPage() {
  const { message, modal } = App.useApp();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission(PERMISSIONS.PRODUCTS_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.PRODUCTS_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.PRODUCTS_DELETE);

  const [filters, setFilters] = useState<Filters>({ page: 1, limit: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const products = useProducts(filters);
  const categories = useCategories();
  const brands = useBrands();
  const deleteProduct = useDeleteProduct();

  const categoryMap = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c.name])),
    [categories.data],
  );
  const brandMap = useMemo(
    () => new Map((brands.data ?? []).map((b) => [b.id, b.name])),
    [brands.data],
  );

  const openCreate = () => {
    setEditingId(null);
    setModalOpen(true);
  };
  const openEdit = (id: number) => {
    setEditingId(id);
    setModalOpen(true);
  };

  const confirmDelete = (product: Product) => {
    modal.confirm({
      title: `¿Dar de baja "${product.name}"?`,
      content:
        'El producto se marcará como inactivo. Podrás reactivarlo editándolo.',
      okText: 'Dar de baja',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await deleteProduct.mutateAsync(product.id);
          message.success('Producto dado de baja');
        } catch (err) {
          message.error(getApiErrorMessage(err, 'No se pudo eliminar'));
        }
      },
    });
  };

  const columns: ColumnsType<Product> = [
    {
      title: 'Código',
      dataIndex: 'code',
      width: 120,
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
      title: 'Marca',
      dataIndex: 'brandId',
      width: 120,
      render: (id: number | null) => (id ? (brandMap.get(id) ?? '—') : '—'),
    },
    {
      title: 'Costo',
      dataIndex: 'costUsd',
      width: 110,
      align: 'right',
      render: (v: string) => formatUsd(Number(v)),
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
      width: 110,
      align: 'center',
      render: (stock: number, row) => {
        const low = stock <= row.minStock;
        return (
          <Tag color={low ? 'error' : 'default'}>
            {stock}
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
        active ? (
          <Tag color="success">Activo</Tag>
        ) : (
          <Tag color="default">Inactivo</Tag>
        ),
    },
    {
      title: '',
      key: 'actions',
      width: 90,
      fixed: 'right',
      render: (_, product) => (
        <Space size="small">
          {canUpdate && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEdit(product.id)}
            />
          )}
          {canDelete && product.isActive && (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(product)}
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
              onSearch={(q) =>
                setFilters((f) => ({ ...f, q: q || undefined, page: 1 }))
              }
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
              onChange={(categoryId) =>
                setFilters((f) => ({ ...f, categoryId, page: 1 }))
              }
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
              options={(brands.data ?? []).map((b) => ({
                value: b.id,
                label: b.name,
              }))}
              onChange={(brandId) =>
                setFilters((f) => ({ ...f, brandId, page: 1 }))
              }
            />
          </Col>
          <Col xs={24} md={2}>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => products.refetch()}
              block
            />
          </Col>
        </Row>

        <Table<Product>
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

      <ProductFormModal
        open={modalOpen}
        productId={editingId}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
