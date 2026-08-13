import { useMemo } from 'react';
import { PictureOutlined } from '@ant-design/icons';
import { Descriptions, Image, Space, Spin, Tag, Typography } from 'antd';
import { formatUsd } from '@autopartes-air/shared';
import { useProduct } from '../hooks/useProducts';
import { useBrands, useCategories } from '../hooks/useCatalogs';
import { useCarBrands } from '../hooks/useCarBrands';
import { useCurrentRates } from '../hooks/useExchangeRates';

const { Text } = Typography;

function formatBs(n: number): string {
  return `Bs ${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Ficha del producto (galería + datos + 3 precios). Reutilizable en cajero y catálogo. */
export function ProductPreview({ productId }: { productId: number | null }) {
  const detail = useProduct(productId);
  const categories = useCategories();
  const brands = useBrands();
  const carBrands = useCarBrands();
  const rates = useCurrentRates();
  const usdt = Number(rates.data?.usdt?.rateBsPerUsd ?? 0);
  const bcv = Number(rates.data?.bcv?.rateBsPerUsd ?? 0);

  const categoryMap = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c.name])),
    [categories.data],
  );
  const brandMap = useMemo(
    () => new Map((brands.data ?? []).map((b) => [b.id, b.name])),
    [brands.data],
  );
  const carBrandMap = useMemo(
    () => new Map((carBrands.data ?? []).map((b) => [b.id, b.name])),
    [carBrands.data],
  );

  if (detail.isLoading || !detail.data) {
    return (
      <div style={{ textAlign: 'center', padding: 32 }}>
        <Spin />
      </div>
    );
  }

  const p = detail.data;
  const priceUsd = Number(p.priceUsd);
  const priceBs = usdt > 0 ? priceUsd * usdt : null;
  const priceUsdBcv = priceBs != null && bcv > 0 ? priceBs / bcv : null;

  return (
    <>
      {p.images.length > 0 ? (
        <Image.PreviewGroup>
          <Space wrap>
            {p.images.map((url, i) => (
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
        <Descriptions.Item label="Código">{p.code}</Descriptions.Item>
        <Descriptions.Item label="Nombre">{p.name}</Descriptions.Item>
        <Descriptions.Item label="N° de pieza">{p.partNumber}</Descriptions.Item>
        <Descriptions.Item label="Categorías">
          {p.categoryIds.length > 0
            ? p.categoryIds.map((id) => categoryMap.get(id) ?? id).join(', ')
            : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Marca">
          {p.brandId ? brandMap.get(p.brandId) ?? '—' : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Marca del carro">
          {p.carBrandId ? carBrandMap.get(p.carBrandId) ?? '—' : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Modelos compatibles">
          {p.carModels.length > 0 ? (
            <Space direction="vertical" size={2}>
              {p.carModels.map((m) => {
                const years =
                  m.yearFrom || m.yearTo
                    ? ` ${m.yearFrom ?? ''}${m.yearTo ? `-${m.yearTo}` : ''}`
                    : '';
                return (
                  <span key={m.carModelId}>
                    {m.name}
                    {years}
                  </span>
                );
              })}
            </Space>
          ) : (
            '—'
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Precio USD">
          <Text strong>{formatUsd(priceUsd)}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Precio Bs">
          {priceBs != null ? formatBs(priceBs) : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Precio USD (BCV)">
          {priceUsdBcv != null ? formatUsd(priceUsdBcv) : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Stock">{p.stock.toLocaleString('es-VE')}</Descriptions.Item>
        <Descriptions.Item label="Estado">
          {p.isActive ? <Tag color="success">Activo</Tag> : <Tag>Inactivo</Tag>}
        </Descriptions.Item>
        {p.shortDescription && (
          <Descriptions.Item label="Descripción">{p.shortDescription}</Descriptions.Item>
        )}
        {p.description && (
          <Descriptions.Item label="Ficha técnica">
            <div style={{ whiteSpace: 'pre-wrap' }}>{p.description}</div>
          </Descriptions.Item>
        )}
      </Descriptions>
    </>
  );
}
