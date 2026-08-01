export function HealthLoading() {
  return (
    <div role="alert" aria-live="assertive" aria-busy className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <svg className="h-10 w-10 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <div>
          <p className="text-lg font-semibold text-foreground">Connecting to service...</p>
          <p className="mt-1 text-sm text-muted-foreground">The server may be starting up. This can take up to 30 seconds.</p>
        </div>
      </div>
    </div>
  );
}
