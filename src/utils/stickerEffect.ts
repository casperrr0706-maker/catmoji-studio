/**
 * 给图片添加手绘风格贴纸描边效果
 * 模拟参考图中的粉色描边 + 轻微阴影
 */

export interface StickerOptions {
  strokeColor?: string;  // 描边颜色，默认从图片提取或粉色
  strokeWidth?: number;  // 描边粗细
  shadowBlur?: number;   // 阴影模糊度
  shadowColor?: string;  // 阴影颜色
  roughness?: number;    // 手绘不规则程度 (0-1)
}

/**
 * 生成手绘风格的不规则路径
 */
function createRoughPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  roughness: number
): void {
  const segments = 32; // 分段数，越多越平滑
  const radiusX = width / 2;
  const radiusY = height / 2;
  const centerX = x + radiusX;
  const centerY = y + radiusY;

  ctx.beginPath();
  
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    // 基础椭圆形状
    let px = centerX + Math.cos(angle) * radiusX;
    let py = centerY + Math.sin(angle) * radiusY;
    
    // 添加手绘不规则抖动
    if (roughness > 0 && i < segments) {
      const jitter = Math.min(radiusX, radiusY) * roughness * 0.15;
      px += (Math.random() - 0.5) * jitter;
      py += (Math.random() - 0.5) * jitter;
    }
    
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      // 使用二次贝塞尔曲线让边缘更自然
      const prevAngle = ((i - 1) / segments) * Math.PI * 2;
      const cpX = centerX + Math.cos(prevAngle + 0.1) * radiusX * 1.05;
      const cpY = centerY + Math.sin(prevAngle + 0.1) * radiusY * 1.05;
      ctx.quadraticCurveTo(cpX, cpY, px, py);
    }
  }
  
  ctx.closePath();
}

/**
 * 创建多层描边效果（模拟手绘线条的粗细变化）
 */
function drawRoughStroke(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  baseWidth: number,
  roughness: number
): void {
  // 主描边
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = baseWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  createRoughPath(ctx, x, y, width, height, roughness);
  ctx.stroke();
  ctx.restore();

  // 内层细线（增加手绘感）
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = baseWidth * 0.6;
  ctx.globalAlpha = 0.7;
  createRoughPath(ctx, x + baseWidth * 0.3, y + baseWidth * 0.3, 
    width - baseWidth * 0.6, height - baseWidth * 0.6, roughness * 0.5);
  ctx.stroke();
  ctx.restore();

  // 随机点缀的小笔触
  if (roughness > 0.3) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = baseWidth * 0.4;
    ctx.globalAlpha = 0.5;
    const numStrokes = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numStrokes; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.max(width, height) * 0.45;
      const sx = x + width/2 + Math.cos(angle) * dist;
      const sy = y + height/2 + Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (Math.random() - 0.5) * 20, sy + (Math.random() - 0.5) * 20);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/**
 * 主函数：给图片添加贴纸描边效果
 */
export async function createStickerEffect(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  options: StickerOptions = {}
): Promise<string> {
  const {
    strokeColor = '#FFB6C1', // 默认浅粉色
    strokeWidth = 12,
    shadowBlur = 8,
    shadowColor = 'rgba(0,0,0,0.15)',
    roughness = 0.4,
  } = options;

  // 创建画布
  const padding = strokeWidth * 3;
  const canvas = document.createElement('canvas');
  const srcWidth = 'naturalWidth' in imageSource ? imageSource.naturalWidth : imageSource.width;
  const srcHeight = 'naturalHeight' in imageSource ? imageSource.naturalHeight : imageSource.height;
  
  canvas.width = srcWidth + padding * 2;
  canvas.height = srcHeight + padding * 2;
  
  const ctx = canvas.getContext('2d')!;

  // 绘制阴影
  ctx.save();
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;
  createRoughPath(ctx, padding, padding, srcWidth, srcHeight, roughness * 0.5);
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  ctx.fill();
  ctx.restore();

  // 绘制描边
  drawRoughStroke(ctx, padding, padding, srcWidth, srcHeight, 
    strokeColor, strokeWidth, roughness);

  // 绘制原图（裁剪到描边内部）
  ctx.save();
  createRoughPath(ctx, padding + strokeWidth/2, padding + strokeWidth/2, 
    srcWidth - strokeWidth, srcHeight - strokeWidth, roughness * 0.3);
  ctx.clip();
  ctx.drawImage(imageSource, padding, padding, srcWidth, srcHeight);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

/**
 * 根据图片主色调生成描边颜色
 */
export function generateStrokeColor(rgb: [number, number, number]): string {
  const [r, g, b] = rgb;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // 如果图片偏暖色调，用粉色系；偏冷色调，用蓝色系
  const isWarm = r > b;
  
  if (isWarm) {
    // 粉色系：浅粉、桃粉、珊瑚粉
    const pinks = ['#FFB6C1', '#FFC0CB', '#FF69B4', '#F4A460', '#FFA07A'];
    return pinks[Math.floor(Math.random() * pinks.length)];
  } else {
    // 蓝色系：天蓝、浅蓝、薄荷
    const blues = ['#87CEEB', '#ADD8E6', '#B0E0E6', '#AFEEEE', '#98D8C8'];
    return blues[Math.floor(Math.random() * blues.length)];
  }
}
