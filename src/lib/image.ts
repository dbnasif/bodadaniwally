/**
 * Redimensiona y comprime la foto en el celular antes de subirla.
 * Esto es clave para confiabilidad: una foto de iPhone puede pesar 5-8MB,
 * y en wifi/datos mediocres de una fiesta eso es lo que más falla al subir.
 */
export async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen en este navegador.');
  ctx.drawImage(bitmap, 0, 0, width, height);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo comprimir la imagen.'))),
      'image/jpeg',
      quality
    );
  });
}
