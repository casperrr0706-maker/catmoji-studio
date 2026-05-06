import { useRef, useState, useCallback } from 'react';
import type { CapturedFrame } from '../types';

const MAX_VIDEO_DURATION = 5000;
const MAX_WIDTH = 1280;

export function useCamera(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const _startStream = useCallback(async (mode: 'user' | 'environment') => {
    const s = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    setStream(s);
    if (videoRef.current) {
      videoRef.current.srcObject = s;
    }
    return s;
  }, [videoRef]);

  const startCamera = useCallback(async () => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); }
    await _startStream(facingMode);
  }, [facingMode, stream, _startStream]);

  const stopCamera = useCallback(() => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
  }, [stream]);

  const restartCamera = useCallback(async () => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); }
    await _startStream(facingMode);
  }, [facingMode, stream, _startStream]);

  const switchCamera = useCallback(async () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  const capturePhoto = useCallback(async (): Promise<CapturedFrame | null> => {
    const video = videoRef.current;
    if (!video) return null;

    const canvas = document.createElement('canvas');
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.min(MAX_WIDTH / vw, 1);
    canvas.width = vw * scale;
    canvas.height = vh * scale;
    const ctx = canvas.getContext('2d')!;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise<CapturedFrame>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) { resolve(null); return; }
        resolve({
          id: crypto.randomUUID(),
          blob,
          dataUrl: canvas.toDataURL('image/png'),
          timestamp: Date.now(),
          type: 'photo',
        });
      }, 'image/png');
    });
  }, [videoRef, facingMode]);

  const startRecording = useCallback(() => {
    if (!stream) return;
    chunksRef.current = [];

    const mimeTypes = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'];
    let mimeType = '';
    for (const mt of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mt)) { mimeType = mt; break; }
    }

    const recorder = new MediaRecorder(stream, {
      mimeType: mimeType || undefined,
      videoBitsPerSecond: 2500000,
    });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      URL.createObjectURL(blob);
    };

    recorder.start();
    setIsRecording(true);

    setTimeout(() => {
      if (recorder.state === 'recording') { recorder.stop(); setIsRecording(false); }
    }, MAX_VIDEO_DURATION);
  }, [stream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  return {
    stream,
    facingMode,
    isRecording,
    startCamera,
    stopCamera,
    switchCamera,
    restartCamera,
    capturePhoto,
    startRecording,
    stopRecording,
  };
}
