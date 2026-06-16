export default function LoadingScreen() {
  return (
    <div className="loading-screen" role="status" aria-label="Loading">
      <svg className="ss-mark" width="120" height="100" viewBox="0 0 120 100" aria-hidden="true">
        <path className="ss-pg ss-pg-l" fill="none" d="M60 46 C44 36, 24 36, 12 40 L12 70 C24 66, 44 66, 60 78 Z" />
        <path className="ss-pg ss-pg-r" fill="none" d="M60 46 C76 36, 96 36, 108 40 L108 70 C96 66, 76 66, 60 78 Z" />
        <path className="ss-spine" fill="none" d="M60 46 L60 78" />
        <path className="ss-line" fill="none" d="M30 64 L46 56 L62 60 L80 40 L100 22" />
        <path className="ss-head" fill="none" d="M91 24 L100 22 L98 33" />
      </svg>
    </div>
  );
}