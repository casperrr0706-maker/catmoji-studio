import { useApp } from '../hooks/useApp';

export default function Preview() {
  const { processedFrame, capturedFrame, accentColor, setState, setProcessedFrame, setCapturedFrame } = useApp();

  const handleRetake = () => {
    setProcessedFrame(null);
    setCapturedFrame(null);
    setState('camera');
  };

  const handleSave = () => {
    if (!processedFrame) return;
    const a = document.createElement('a');
    a.href = processedFrame;
    a.download = `catmoji_${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="preview-container">
      <div className="preview-header">
        <button className="back-btn" onClick={handleRetake}>
          ← 重拍
        </button>
        <h2>创作预览</h2>
        <div style={{ width: 60 }} />
      </div>

      {/* 棋盘格背景展示透明抠图 */}
      <div className="preview-canvas">
        <div className="checkerboard-bg">
          <img src={processedFrame || ''} alt="Cutout result" className="preview-image" />
        </div>
      </div>

      {/* 原图对比 */}
      <div className="original-compare">
        <p className="compare-label">原图</p>
        <img src={capturedFrame?.dataUrl || ''} alt="Original" className="original-thumb" />
      </div>

      {/* 色彩信息 */}
      <div className="color-info">
        <div
          className="color-swatch"
          style={{ backgroundColor: accentColor.hex }}
        />
        <div className="color-details">
          <span className="color-hex">{accentColor.hex}</span>
          <span className="color-rgb">
            RGB({accentColor.rgb.join(', ')})
          </span>
          {accentColor.isFallback && (
            <span className="color-fallback">自动回退至学术灰</span>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="preview-actions">
        <button className="action-btn secondary" onClick={handleRetake}>
          🔄 重拍
        </button>
        <button className="action-btn primary" onClick={handleSave}>
          💾 保存作品
        </button>
      </div>
    </div>
  );
}
