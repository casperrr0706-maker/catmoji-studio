import { useApp } from '../hooks/useApp';

export default function Welcome() {
  const { setState } = useApp();

  return (
    <div className="welcome-container">
      <div className="welcome-illustration">
        {/* 简笔画猫咪 */}
        <svg viewBox="0 0 200 200" width="180" height="180" fill="none" stroke="var(--accent-color, #708090)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* 猫头 */}
          <ellipse cx="100" cy="120" rx="50" ry="45" />
          {/* 左耳 */}
          <path d="M60 85 L50 50 L80 75" />
          {/* 右耳 */}
          <path d="M140 85 L150 50 L120 75" />
          {/* 眼睛 */}
          <circle cx="82" cy="115" r="6" fill="var(--accent-color, #708090)" />
          <circle cx="118" cy="115" r="6" fill="var(--accent-color, #708090)" />
          {/* 眼睛高光 */}
          <circle cx="84" cy="113" r="2" fill="white" />
          <circle cx="120" cy="113" r="2" fill="white" />
          {/* 鼻子 */}
          <path d="M97 130 L100 135 L103 130 Z" fill="var(--accent-color, #708090)" />
          {/* 嘴巴 */}
          <path d="M92 138 Q100 145 108 138" />
          {/* 胡须 */}
          <line x1="55" y1="125" x2="80" y2="128" />
          <line x1="55" y1="135" x2="80" y2="133" />
          <line x1="120" y1="128" x2="145" y2="125" />
          <line x1="120" y1="133" x2="145" y2="135" />
        </svg>
      </div>

      <h1 className="welcome-title">CatMoji Studio</h1>
      <p className="welcome-subtitle">为你的猫咪，创造独一无二的表达</p>

      <div className="welcome-features">
        <div className="feature-item">
          <span className="feature-icon">📸</span>
          <span>拍摄你的猫咪</span>
        </div>
        <div className="feature-item">
          <span className="feature-icon">✂️</span>
          <span>AI 智能抠图</span>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🎨</span>
          <span>动态色彩适配</span>
        </div>
      </div>

      <button
        className="start-btn"
        onClick={() => setState('camera')}
      >
        开始创作
      </button>

      <p className="welcome-note">
        所有数据仅存储在本地设备上，完全保护隐私 🐾
      </p>
    </div>
  );
}
