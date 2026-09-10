import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DownloadOutlined,
  LoginOutlined,
  PictureOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Layout,
  Pagination,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { formatUsd } from '@autopartes-air/shared';
import {
  getCatalogFilters,
  getCatalogRates,
  listCatalog,
  type CatalogItem,
} from '../api/catalog.api';
import { useIsMobile } from '../hooks/useResponsive';
import { COLORS } from '../theme/tokens';

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const DEFAULT_PAGE_SIZE = 20;
/** Tope de filas del PDF: lo que la API acepta de una sola vez. */
const PDF_LIMIT = 200;

function formatBs(n: number): string {
  return `Bs ${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Catálogo público: la cara del sistema para quien todavía no inició sesión.
 *
 * Muestra lo que un cliente necesita para decidir si viene a la tienda —
 * producto, compatibilidad, precio y si hay— y nada de lo que no le incumbe:
 * ni el costo, ni el margen, ni cuántas unidades quedan.
 */
export function CatalogPage() {
  const { message } = App.useApp();
  const isMobile = useIsMobile();

  const [search, setSearch] = useState('');
  /** Texto ya "asentado" (con debounce): es el que dispara la consulta. */
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [carBrandId, setCarBrandId] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [downloading, setDownloading] = useState(false);

  // Se espera a que el usuario deje de teclear para no consultar letra por letra.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const filters = { q: query || undefined, categoryId, carBrandId };

  const catalog = useQuery({
    queryKey: ['catalogo', filters, page, pageSize],
    queryFn: () => listCatalog({ ...filters, page, limit: pageSize }),
    placeholderData: (prev) => prev,
  });
  const options = useQuery({ queryKey: ['catalogo-filtros'], queryFn: getCatalogFilters });
  const rates = useQuery({ queryKey: ['catalogo-tasas'], queryFn: getCatalogRates });

  const usdt = rates.data?.usdt ?? null;
  const items = catalog.data?.data ?? [];
  const total = catalog.data?.meta.total ?? 0;

  /** Descripción de los filtros activos, para estamparla en el PDF. */
  const filterLabel = useMemo(() => {
    const parts: string[] = [];
    if (query) parts.push(`Búsqueda: "${query}"`);
    const cat = options.data?.categories.find((c) => c.id === categoryId);
    if (cat) parts.push(`Categoría: ${cat.name}`);
    const brand = options.data?.carBrands.find((b) => b.id === carBrandId);
    if (brand) parts.push(`Marca: ${brand.name}`);
    return parts.join(' · ');
  }, [query, categoryId, carBrandId, options.data]);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      // Se piden todos los resultados del filtro, no solo la página en pantalla:
      // quien descarga la lista la quiere completa.
      const all = await listCatalog({ ...filters, page: 1, limit: PDF_LIMIT });
      if (all.data.length === 0) {
        message.warning('No hay productos que coincidan con la búsqueda');
        return;
      }
      // jsPDF y sus dependencias pesan ~400 KB: se cargan al pedir el PDF, no
      // al abrir el catálogo (que es la pantalla que más gente va a ver).
      const { buildCatalogPdf, catalogPdfFileName } = await import('../lib/catalog-pdf');
      const doc = buildCatalogPdf(all.data, rates.data ?? { usdt: null, bcv: null, updatedAt: null }, {
        filters: filterLabel || undefined,
      });
      doc.save(catalogPdfFileName());
      if (all.meta.total > all.data.length) {
        message.info(
          `El PDF incluye los primeros ${all.data.length} de ${all.meta.total} productos. Filtra para acotar la lista.`,
        );
      }
    } catch {
      message.error('No se pudo generar el PDF');
    } finally {
      setDownloading(false);
    }
  };

  const priceBlock = (it: CatalogItem) => {
    const usd = it.priceUsd != null ? Number(it.priceUsd) : null;
    if (usd == null) return <Text type="secondary">Consultar precio</Text>;
    return (
      <>
        <Text strong style={{ fontSize: 18 }}>
          {formatUsd(usd)}
        </Text>
        {usdt != null && (
          <>
            <br />
            <Text type="secondary">{formatBs(Math.round(usd * usdt * 100) / 100)}</Text>
          </>
        )}
      </>
    );
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Header
        style={{
          background: '#fff',
          borderBottom: '1px solid #e8e8e8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 16px' : '0 32px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Space>
          <Avatar shape="square" style={{ background: COLORS.primary }}>
            A
          </Avatar>
          <Text strong style={{ fontSize: 18 }}>
            AutoparteAIR
          </Text>
        </Space>
        <Link to="/login">
          <Button type="primary" icon={<LoginOutlined />}>
            {isMobile ? 'Entrar' : 'Iniciar sesión'}
          </Button>
        </Link>
      </Header>

      <Content style={{ padding: isMobile ? 16 : 32 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>
            Catálogo de repuestos
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 24 }}>
            Consulta precios y disponibilidad. Descarga la lista en PDF para
            compartirla.
          </Paragraph>

          <Card size="small" style={{ marginBottom: 24 }}>
            <Row gutter={[12, 12]}>
              <Col xs={24} md={10}>
                <Input
                  allowClear
                  size="large"
                  prefix={<SearchOutlined />}
                  placeholder="Buscar: evaporador toyota, compresor, 905…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Col>
              <Col xs={12} md={5}>
                <Select
                  allowClear
                  size="large"
                  style={{ width: '100%' }}
                  placeholder="Categoría"
                  value={categoryId}
                  onChange={(v) => {
                    setCategoryId(v);
                    setPage(1);
                  }}
                  options={options.data?.categories.map((c) => ({ value: c.id, label: c.name }))}
                />
              </Col>
              <Col xs={12} md={5}>
                <Select
                  allowClear
                  size="large"
                  showSearch
                  optionFilterProp="label"
                  style={{ width: '100%' }}
                  placeholder="Marca del vehículo"
                  value={carBrandId}
                  onChange={(v) => {
                    setCarBrandId(v);
                    setPage(1);
                  }}
                  options={options.data?.carBrands.map((b) => ({ value: b.id, label: b.name }))}
                />
              </Col>
              <Col xs={24} md={4}>
                <Button
                  block
                  size="large"
                  icon={<DownloadOutlined />}
                  loading={downloading}
                  onClick={downloadPdf}
                >
                  PDF
                </Button>
              </Col>
            </Row>
          </Card>

          {catalog.isLoading ? (
            <div style={{ textAlign: 'center', padding: 64 }}>
              <Spin size="large" />
            </div>
          ) : items.length === 0 ? (
            <Empty description="No encontramos repuestos con esos criterios" />
          ) : (
            <>
              <Text type="secondary">
                {total.toLocaleString('es-VE')} repuesto{total === 1 ? '' : 's'}
              </Text>
              <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
                {items.map((it) => (
                  <Col key={it.id} xs={24} sm={12} lg={8} xl={6}>
                    <Card
                      hoverable
                      styles={{ body: { padding: 16 } }}
                      cover={
                        <div
                          style={{
                            height: 180,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#fafafa',
                            overflow: 'hidden',
                          }}
                        >
                          {it.imageUrl ? (
                            <img
                              src={it.imageUrl}
                              alt={it.name}
                              loading="lazy"
                              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                            />
                          ) : (
                            <PictureOutlined style={{ fontSize: 40, color: '#bfbfbf' }} />
                          )}
                        </div>
                      }
                    >
                      <Space size={4} wrap style={{ marginBottom: 8 }}>
                        <Tag color={it.available ? 'success' : 'default'}>
                          {it.available ? 'Disponible' : 'Agotado'}
                        </Tag>
                        {it.isUniversal && <Tag color="purple">Universal</Tag>}
                        {it.categoryName && <Tag>{it.categoryName}</Tag>}
                      </Space>
                      <Text strong style={{ display: 'block' }}>
                        {it.name}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {it.code} · Nº pieza {it.partNumber}
                        {it.brandName ? ` · ${it.brandName}` : ''}
                      </Text>
                      <div style={{ marginTop: 8, minHeight: 36 }}>
                        <Text style={{ fontSize: 12 }}>
                          {it.isUniversal
                            ? 'Compatible con cualquier vehículo'
                            : [it.carBrandName, it.carModels.join(', ')]
                                .filter(Boolean)
                                .join(' · ') || 'Compatibilidad no especificada'}
                        </Text>
                      </div>
                      <div style={{ marginTop: 12 }}>{priceBlock(it)}</div>
                    </Card>
                  </Col>
                ))}
              </Row>

              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <Pagination
                  align="center"
                  current={page}
                  pageSize={pageSize}
                  total={total}
                  showSizeChanger
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  // En móvil el paginador completo no cabe: se dejan las flechas.
                  simple={isMobile ? { readOnly: true } : false}
                  locale={{ items_per_page: '/ página' }}
                  onChange={(p) => {
                    setPage(p);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onShowSizeChange={(_, size) => {
                    // Al cambiar el tamaño se vuelve a la primera página: si
                    // estabas en la 5 de 10 en 10, la 5 de 50 en 50 no existe.
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </div>
            </>
          )}
        </div>
      </Content>

      <Footer style={{ textAlign: 'center', background: 'transparent' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          AutoparteAIR · Precios referenciales sujetos a cambio sin previo aviso
        </Text>
      </Footer>
    </Layout>
  );
}
