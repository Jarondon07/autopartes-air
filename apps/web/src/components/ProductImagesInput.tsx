import { useState } from 'react';
import {
  DeleteOutlined,
  LeftOutlined,
  PlusOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { App, Button, Tag, Typography, Upload } from 'antd';
import { getApiErrorMessage } from '../api/client';
import { uploadImage } from '../api/uploads.api';
import { ImageCropModal } from './ImageCropModal';

const { Text } = Typography;

interface Props {
  value?: string[];
  onChange?: (urls: string[]) => void;
  max?: number;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Galería de imágenes con recorte (corte libre), reordenamiento por posición
 * (la primera es la principal) y un máximo configurable.
 */
export function ProductImagesInput({ value = [], onChange, max = 10 }: Props) {
  const { message } = App.useApp();
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const set = (urls: string[]) => onChange?.(urls);

  const onPick = async (file: File) => {
    if (value.length >= max) {
      message.warning(`Máximo ${max} imágenes`);
      return;
    }
    try {
      setCropSrc(await readAsDataUrl(file));
    } catch {
      message.error('No se pudo leer la imagen');
    }
  };

  const onCropped = async (blob: Blob) => {
    setUploading(true);
    try {
      const file = new File([blob], 'imagen.png', { type: 'image/png' });
      const url = await uploadImage(file);
      set([...value, url]);
      setCropSrc(null);
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo subir la imagen'));
    } finally {
      setUploading(false);
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    const tmp = next[index]!;
    next[index] = next[target]!;
    next[target] = tmp;
    set(next);
  };

  const remove = (index: number) => set(value.filter((_, i) => i !== index));

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {value.map((url, i) => (
          <div
            key={url}
            style={{
              width: 104,
              border: '1px solid #e9ecef',
              borderRadius: 6,
              padding: 4,
              position: 'relative',
            }}
          >
            <img
              src={url}
              alt={`img-${i}`}
              style={{ width: '100%', height: 72, objectFit: 'contain' }}
            />
            <div style={{ textAlign: 'center', marginTop: 2 }}>
              {i === 0 ? (
                <Tag color="blue" style={{ margin: 0 }}>
                  Principal
                </Tag>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Posición {i + 1}
                </Text>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <Button
                type="text"
                size="small"
                icon={<LeftOutlined />}
                disabled={i === 0}
                onClick={() => move(i, -1)}
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => remove(i)}
              />
              <Button
                type="text"
                size="small"
                icon={<RightOutlined />}
                disabled={i === value.length - 1}
                onClick={() => move(i, 1)}
              />
            </div>
          </div>
        ))}

        {value.length < max && (
          <Upload
            listType="picture-card"
            showUploadList={false}
            accept="image/*"
            beforeUpload={(file) => {
              void onPick(file);
              return false;
            }}
          >
            <div>
              <PlusOutlined />
              <div style={{ marginTop: 6 }}>Agregar</div>
            </div>
          </Upload>
        )}
      </div>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {value.length}/{max} imágenes. La primera es la principal; usa ‹ › para ordenar.
      </Text>

      <ImageCropModal
        open={cropSrc != null}
        src={cropSrc}
        loading={uploading}
        onCancel={() => setCropSrc(null)}
        onConfirm={onCropped}
      />
    </div>
  );
}
