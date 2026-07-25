export function AppLoadingScreen({ message = "Загружаем приложение…" }: { message?: string }) {
  return (
    <div className="app-loading-screen" role="status" aria-live="polite">
      <div className="app-loading-card">
        <div className="app-loading-mark" aria-hidden="true">
          M
        </div>
        <p className="app-loading-title">MelodyTrack</p>
        <p className="app-loading-message">{message}</p>
        <div className="app-loading-spinner" aria-hidden="true" />
      </div>
    </div>
  );
}
