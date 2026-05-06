import { removeBackground } from '@imgly/background-removal';

export interface BgProgress {
  stage: string;
  percent: number;
}

export async function removeImageBackground(
  imageBlob: Blob,
  onProgress?: (p: BgProgress) => void
): Promise<Blob> {
  const result = await removeBackground(imageBlob, {
    output: {
      format: 'image/png',
      quality: 0.8,
    },
    progress: (key: string, current: number, total: number) => {
      if (!onProgress) return;
      const pct = total > 0 ? Math.round((current / total) * 100) : 0;
      // 识别不同阶段
      if (key.includes('onnx') || key.includes('ort-wasm')) {
        onProgress({ stage: '加载识别引擎', percent: pct });
      } else if (key.includes('model')) {
        onProgress({ stage: '加载AI模型', percent: pct });
      } else {
        onProgress({ stage: '处理中', percent: pct });
      }
    },
  });
  return result;
}

/**
 * 给抠图结果添加手绘风格贴纸边框
 * 通过 alpha 通道检测物体轮廓，沿轮廓绘制彩色边框
 */
export function addStickerBorder(
  cutoutDataUrl: string,
  borderColor: string = '#FFB6C1'
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      const canvas = document.createElement('canvas');
      const padding = 24;
      canvas.width = w + padding * 2;
      canvas.height = h + padding * 2;
      const ctx = canvas.getContext('2d')!;

      // 1. 先绘制带阴影的版本（营造贴纸立体感）
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.12)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
      ctx.drawImage(img, padding, padding);
      ctx.restore();

      // 2. 绘制彩色边框层：在原图基础上膨胀 alpha 通道
      const borderCanvas = document.createElement('canvas');
      borderCanvas.width = w;
      borderCanvas.height = h;
      const bCtx = borderCanvas.getContext('2d')!;
      
      // 先获取原始 alpha 蒙版
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = w;
      srcCanvas.height = h;
      const sCtx = srcCanvas.getContext('2d')!;
      sCtx.drawImage(img, 0, 0);
      const srcData = sCtx.getImageData(0, 0, w, h);
      const alphaMask = srcData.data;

      // 创建边框蒙版：检测透明像素中哪些靠近非透明像素
      const borderMask = bCtx.createImageData(w, h);
      const borderData = borderMask.data;
      const borderRadius = 6; // 边框粗细（像素）

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const alpha = alphaMask[idx + 3];
          
          if (alpha > 128) {
            // 非透明像素：保持透明（让原图显示）
            continue;
          }
          
          // 透明像素：检查附近是否有非透明像素
          let nearOpaque = false;
          const r = borderRadius;
          for (let dy = -r; dy <= r && !nearOpaque; dy++) {
            for (let dx = -r; dx <= r && !nearOpaque; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                const nIdx = (ny * w + nx) * 4;
                if (alphaMask[nIdx + 3] > 128) {
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  if (dist <= r) {
                    nearOpaque = true;
                    // 边框透明度：靠近主体的部分更不透明
                    const fade = 1 - (dist / r);
                    borderData[idx] = 255;     // R
                    borderData[idx + 1] = 255; // G
                    borderData[idx + 2] = 255; // B
                    borderData[idx + 3] = Math.round(255 * fade); // A
                  }
                }
              }
            }
          }
        }
      }

      // 3. 将边框蒙版着色为目标颜色
      const colorCanvas = document.createElement('canvas');
      colorCanvas.width = w;
      colorCanvas.height = h;
      const cCtx = colorCanvas.getContext('2d')!;
      
      // 先填充目标颜色
      cCtx.fillStyle = borderColor;
      cCtx.fillRect(0, 0, w, h);
      
      // 用边框蒙版做遮罩
      const colorData = cCtx.getImageData(0, 0, w, h);
      for (let i = 0; i < borderData.length; i += 4) {
        const alpha = borderData[i + 3];
        colorData[i + 3] = alpha; // 只保留 alpha
      }
      cCtx.putImageData(colorData, 0, 0);

      // 4. 合成到主画布
      ctx.drawImage(colorCanvas, padding, padding);
      ctx.drawImage(img, padding, padding);

      resolve(canvas.toDataURL('image/png'));
    };
    img.src = cutoutDataUrl;
  });
}
