import { useRef, useState } from 'react';
import { Modal, Typography } from 'antd';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const { Text } = Typography;

interface Props {
  open: boolean;
  /** Imagen origen como data URL. */
  src: string | null;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

/** Genera un Blob PNG del recorte a resolución real de la imagen. */
async function cropToBlob(
  image: HTMLImageElement,
  crop: PixelCrop,
): Promise<Blob | null> {
  if (!crop.width || !crop.height) return null;
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(crop.width * scaleX);
  canvas.height = Math.floor(crop.height * scaleY);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

/** Modal para recortar una imagen con corte libre (cualquier proporción). */
export function ImageCropModal({ open, src, loading, onCancel, onConfirm }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completed, setCompleted] = useState<PixelCrop>();

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    // Recorte inicial: 80% centrado (el usuario lo ajusta libremente).
    setCrop({ unit: '%', x: 10, y: 10, width: 80, height: 80 });
    setCompleted({
      unit: 'px',
      x: width * 0.1,
      y: height * 0.1,
      width: width * 0.8,
      height: height * 0.8,
    });
  };

  const handleOk = async () => {
    if (!imgRef.current || !completed) return;
    const blob = await cropToBlob(imgRef.current, completed);
    if (blob) onConfirm(blob);
  };

  return (
    <Modal
      open={open}
      title="Ajustar imagen"
      onCancel={onCancel}
      onOk={handleOk}
      okText="Aplicar recorte"
      cancelText="Cancelar"
      confirmLoading={loading}
      okButtonProps={{ disabled: !completed?.width }}
      width={640}
      destroyOnClose
    >
      <Text type="secondary">
        Arrastra para seleccionar el área; puedes ajustar el recorte libremente.
      </Text>
      <div style={{ marginTop: 12, textAlign: 'center', background: '#f5f5f5', padding: 8 }}>
        {src && (
          <ReactCrop
            crop={crop}
            onChange={(_px, percent) => setCrop(percent)}
            onComplete={(px) => setCompleted(px)}
          >
            <img
              ref={imgRef}
              src={src}
              alt="Recortar"
              onLoad={onImageLoad}
              style={{ maxWidth: '100%', maxHeight: '60vh' }}
            />
          </ReactCrop>
        )}
      </div>
    </Modal>
  );
}
