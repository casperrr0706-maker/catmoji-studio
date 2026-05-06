import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

let segmenter: ImageSegmenter | null = null;
let initPromise: Promise<ImageSegmenter> | null = null;

export async function getSegmenter(): Promise<ImageSegmenter> {
  if (segmenter) return segmenter;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // 使用本地部署的 WASM 和模型文件，避免 Google CDN 在国内不可达
    const vision = await FilesetResolver.forVisionTasks(
      import.meta.env.DEV
        ? 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        : './wasm'
    );
    const s = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: import.meta.env.DEV
          ? 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite'
          : './models/selfie_multiclass_256x256.tflite',
        delegate: 'GPU',
      },
      runningMode: 'IMAGE',
      outputCategoryMask: true,
      outputConfidenceMasks: false,
    });
    segmenter = s;
    return s;
  })();

  return initPromise;
}

/**
 * 从 MPMask 获取像素数据（兼容不同版本 API）
 */
async function getMaskPixels(mask: unknown, w: number, h: number): Promise<Uint8ClampedArray> {
  // 尝试方案1: 作为 ImageBitmap 使用
  try {
    const bitmap = mask as ImageBitmap;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    return ctx.getImageData(0, 0, w, h).data;
  } catch {
    // 尝试方案2: 转换为 blob 再绘制
    try {
      const resp = await fetch(URL.createObjectURL(mask as Blob));
      const blob = await resp.blob();
      const bmp = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bmp, 0, 0);
      bmp.close();
      return ctx.getImageData(0, 0, bmp.width, bmp.height).data;
    } catch {
      throw new Error('Failed to read mask data');
    }
  }
}

/**
 * 智能抠图：自动判断宠物在前景还是背景
 * 策略: 分析画面中心区域的 mask 值
 * - 如果中心区域前景(mask>0)占比 < 30%，说明主体被归为背景，需反转
 */
export async function smartRemoveBackground(
  imageSource: HTMLImageElement | HTMLCanvasElement
): Promise<string> {
  const s = await getSegmenter();
  const imageBitmap = await createImageBitmap(imageSource);
  const result = s.segment(imageBitmap);

  const mask = result.categoryMask;
  if (!mask) throw new Error('No mask returned from segmentation');

  const w = imageBitmap.width;
  const h = imageBitmap.height;
  const maskPixels = await getMaskPixels(mask, w, h);

  // 分析中心区域 mask
  const cx1 = Math.floor(w * 0.3), cx2 = Math.floor(w * 0.7);
  const cy1 = Math.floor(h * 0.3), cy2 = Math.floor(h * 0.7);
  let fgCount = 0, total = 0;
  for (let y = cy1; y < cy2; y++) {
    for (let x = cx1; x < cx2; x++) {
      const idx = (y * w + x) * 4;
      total++;
      if (maskPixels[idx] > 0) fgCount++;
    }
  }
  const invertMask = (fgCount / total) < 0.3;

  // 执行抠图
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(imageBitmap, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const px = imgData.data;

  for (let i = 0; i < px.length; i += 4) {
    const mv = maskPixels[i];
    const isFg = invertMask ? mv === 0 : mv > 0;
    if (!isFg) px[i + 3] = 0;
  }

  ctx.putImageData(imgData, 0, 0);
  imageBitmap.close();
  try { (mask as unknown as { close(): void }).close(); } catch { /* noop */ }

  return canvas.toDataURL('image/png');
}
