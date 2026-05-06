export interface CapturedFrame {
  id: string;
  blob: Blob;
  dataUrl: string;
  timestamp: number;
  type: 'photo' | 'video';
}

export interface ColorResult {
  rgb: [number, number, number];
  hex: string;
  isFallback: boolean;
}

export type AppState = 'idle' | 'camera' | 'processing' | 'preview' | 'editing';

export interface AppContextType {
  state: AppState;
  setState: (state: AppState) => void;
  capturedFrame: CapturedFrame | null;
  setCapturedFrame: (frame: CapturedFrame | null) => void;
  processedFrame: string | null; // dataUrl of cutout result
  setProcessedFrame: (dataUrl: string | null) => void;
  accentColor: ColorResult;
  setAccentColor: (color: ColorResult) => void;
}
