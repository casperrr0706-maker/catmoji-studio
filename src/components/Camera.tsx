import { useEffect, useRef, useCallback, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { useCamera } from '../hooks/useCamera';
import { removeImageBackground, addStickerBorder } from '../utils/backgroundRemoval';
import { extractDominantColor, applyAccentColor } from '../utils/colorEngine';
import type { BgProgress } from '../utils/backgroundRemoval';

export default function Camera() {
  const { setState, setCapturedFrame, setProcessedFrame, setAccentColor } = useApp();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const {
    facingMode,
    isRecording,
    startCamera,
    stopCamera,
    switchCamera,
    restartCamera,
    capturePhoto,
    startRecording,
    stopRecording,
  } = useCamera(videoRef);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<BgProgress>({ stage: '', percent: 0 });

  useEffect(() => {
    startCamera()
      .then(() => setCameraReady(true))
      .catch((err: unknown) => {
        console.error('Camera error:', err);
        const e = err as { name?: string; message?: string };
        if (e?.name === 'NotAllowedError') {
          setCameraError('请在浏览器设置中允许相机权限后刷新页面');
        } else if (e?.name === 'NotFoundError') {
          setCameraError('未检测到可用的摄像头');
        } else if (String(window.location.protocol) === 'http:') {
          setCameraError('手机浏览器需要 HTTPS 才能访问相机。\n请在电脑上打开 localhost 测试，或等待部署到 HTTPS 环境。');
        } else {
          setCameraError(`相机启动失败: ${e?.message || err}`);
        }
      });
    return () => { stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      restartCamera().catch((err: unknown) => {
        const e = err as { message?: string };
        setCameraError(`切换镜头失败: ${e?.message || err}`);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || processing || !cameraReady) return;
    const frame = await capturePhoto();
    if (!frame) return;

    setCapturedFrame(frame);
    setState('processing');
    setProcessing(true);
    setProgress({ stage: '准备中', percent: 0 });

    try {
      // 1. AI 背景移除
      setProgress({ stage: '识别猫咪中', percent: 5 });
      const cutoutBlob = await removeImageBackground(frame.blob, (p) => {
        setProgress(p);
      });

      // 2. 提取主色调
      setProgress({ stage: '分析色彩', percent: 90 });
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = frame.dataUrl;
      await new Promise<void>((resolve) => { img.onload = () => resolve(); });
      const color = await extractDominantColor(img);
      applyAccentColor(color);
      setAccentColor(color);

      // 3. 添加贴纸边框
      setProgress({ stage: '生成贴纸', percent: 95 });
      const cutoutUrl = URL.createObjectURL(cutoutBlob);
      const stickerUrl = await addStickerBorder(cutoutUrl, color.isFallback ? '#FFB6C1' : color.hex);

      setProcessedFrame(stickerUrl);
      setState('preview');
    } catch (err) {
      console.error('Processing failed:', err);
      // 降级：直接显示原图
      setProcessedFrame(frame.dataUrl);
      setState('preview');
    } finally {
      setProcessing(false);
    }
  }, [capturePhoto, cameraReady, processing, setCapturedFrame, setAccentColor, setProcessedFrame, setState]);

  return (
    <div className="camera-container" style={cameraError ? { background: 'var(--bg-color)' } : undefined}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`camera-video ${facingMode === 'user' ? 'mirrored' : ''}`}
        style={{ display: cameraError ? 'none' : 'block' }}
      />

      {cameraError && (
        <div className="camera-error-panel">
          <div className="error-icon">📷</div>
          <p className="error-message">{cameraError}</p>
          <button className="retry-btn" onClick={() => window.location.reload()}>刷新重试</button>
        </div>
      )}

      {isRecording && (
        <div className="recording-indicator">
          <span className="recording-dot" />
          REC
        </div>
      )}

      {cameraReady && !processing && (
        <div className="model-status ready">
          <span>✓ 相机就绪</span>
        </div>
      )}

      {processing && (
        <div className="processing-overlay">
          <div className="loading-spinner large" />
          <p className="processing-stage">{progress.stage}</p>
          {progress.percent > 0 && (
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(progress.percent, 100)}%` }}
              />
            </div>
          )}
          {progress.percent > 0 && (
            <p className="progress-text">{Math.min(progress.percent, 100)}%</p>
          )}
          <p className="processing-hint">首次使用需下载AI模型，请耐心等待</p>
        </div>
      )}

      <div className="camera-controls" style={cameraError ? { display: 'none' } : undefined}>
        <button className="control-btn switch-btn" onClick={() => { setCameraError(''); switchCamera(); }} title="切换镜头">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 7h-4l-2-3H10L8 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
        </button>
        <button className="shutter-btn" onClick={handleCapture} disabled={processing || !cameraReady} title="拍照">
          <div className="shutter-inner" />
        </button>
        <button
          className={`control-btn record-btn ${isRecording ? 'recording' : ''}`}
          onPointerDown={startRecording}
          onPointerUp={stopRecording}
          disabled={processing || !cameraReady}
          title="长按录制"
        >
          <div className="record-inner" />
        </button>
      </div>
    </div>
  );
}
