import { useState, useCallback } from 'react';
import { AppContext } from './hooks/useApp';
import type { AppState, CapturedFrame, ColorResult } from './types';
import Welcome from './components/Welcome';
import Camera from './components/Camera';
import Preview from './components/Preview';
import './App.css';

const DEFAULT_COLOR: ColorResult = {
  rgb: [112, 128, 144],
  hex: '#708090',
  isFallback: true,
};

export default function App() {
  const [state, setState] = useState<AppState>('idle');
  const [capturedFrame, setCapturedFrame] = useState<CapturedFrame | null>(null);
  const [processedFrame, setProcessedFrame] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState<ColorResult>(DEFAULT_COLOR);

  return (
    <AppContext.Provider
      value={{
        state,
        setState,
        capturedFrame,
        setCapturedFrame,
        processedFrame,
        setProcessedFrame,
        accentColor,
        setAccentColor,
      }}
    >
      <div className="app">
        <div id="toast-container" />
        {state === 'idle' && <Welcome />}
        {(state === 'camera' || state === 'processing') && <Camera />}
        {state === 'preview' && <Preview />}
      </div>
    </AppContext.Provider>
  );
}
