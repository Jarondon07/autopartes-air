/**
 * Preparación de imágenes antes de subirlas.
 *
 * Las fotos de teléfono llegan a 4000 px y varios MB, y el recorte se exportaba
 * como PNG a resolución completa — que pesa MÁS que el JPEG original y hacía
 * que Nginx rechazara la subida con 413. Aquí se acota el lado mayor y se
 * exporta JPEG: una foto de 8 MB baja a ~300 KB sin diferencia visible en
 * pantalla, y el catálogo carga rápido desde el teléfono.
 */

/** Lado mayor de una foto de producto. Suficiente para la ficha y el zoom. */
export const MAX_IMAGE_SIDE = 1400;
/** Lado mayor de un logo de marca (se muestra a ~72 px). */
export const MAX_LOGO_SIDE = 400;
/**
 * Calidad de compresión. 0,8 en WebP es visualmente indistinguible del original
 * en pantalla; bajar más deja artefactos visibles en bordes y texto (los
 * repuestos suelen traer números de pieza impresos).
 */
const QUALITY = 0.8;

/**
 * Formato de salida, del más liviano al más compatible.
 *
 * WebP pesa ~30 % menos que JPEG a igual calidad y lo soportan todos los
 * navegadores actuales. `canvas.toBlob` con un tipo no soportado cae
 * silenciosamente a PNG (que pesa mucho más), por eso se comprueba el `type`
 * del blob resultante en vez de confiar en la petición.
 */
const FORMATS = ['image/webp', 'image/jpeg'] as const;

/** Lee un archivo como data URL (para previsualizar y recortar). */
export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Reduce un canvas para que su lado mayor no supere `maxSide` y lo exporta
 * como JPEG. Si ya es más pequeño, no lo agranda.
 */
export function canvasToJpegBlob(
  source: HTMLCanvasElement,
  maxSide: number,
): Promise<Blob | null> {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  let canvas = source;

  if (scale < 1) {
    const target = document.createElement('canvas');
    target.width = Math.round(source.width * scale);
    target.height = Math.round(source.height * scale);
    const ctx = target.getContext('2d');
    if (!ctx) return Promise.resolve(null);
    // Suavizado alto: sin esto, reducir mucho deja bordes dentados.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, target.width, target.height);
    canvas = target;
  }

  // Fondo blanco: el JPEG no tiene transparencia y un PNG transparente
  // saldría con fondo negro.
  const flat = document.createElement('canvas');
  flat.width = canvas.width;
  flat.height = canvas.height;
  const fctx = flat.getContext('2d');
  if (!fctx) return Promise.resolve(null);
  fctx.fillStyle = '#ffffff';
  fctx.fillRect(0, 0, flat.width, flat.height);
  fctx.drawImage(canvas, 0, 0);

  return encodeSmallest(flat);
}

/** Codifica el canvas en el formato más liviano que el navegador soporte. */
async function encodeSmallest(canvas: HTMLCanvasElement): Promise<Blob | null> {
  for (const type of FORMATS) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), type, QUALITY),
    );
    // Si el navegador no sabe codificar ese tipo devuelve PNG: se descarta y
    // se prueba el siguiente.
    if (blob && blob.type === type) return blob;
  }
  // Último recurso: lo que sea que produzca el navegador.
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', QUALITY));
}

/**
 * Carga el archivo elegido y lo devuelve como data URL ya reducido, para
 * mostrarlo en el recortador. Una foto de 12 MP en memoria (más su base64)
 * ahoga a un teléfono; 2400 px sobra para recortar con precisión.
 */
export async function fileToCropSource(file: File, maxSide = 2400): Promise<string> {
  const dataUrl = await readAsDataUrl(file);
  const img = await loadImage(dataUrl);
  if (Math.max(img.width, img.height) <= maxSide) return dataUrl;

  const scale = maxSide / Math.max(img.width, img.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/** Decodifica un data URL a un <img> listo para dibujar en canvas. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Envuelve el blob comprimido en un File con la extensión que corresponde a su
 * tipo real. El servidor guarda el archivo con esa extensión, así que si no
 * coinciden el navegador luego no sabría qué está sirviendo.
 */
export function blobToUploadFile(blob: Blob, baseName: string): File {
  const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
  return new File([blob], `${baseName}.${ext}`, { type: blob.type });
}
