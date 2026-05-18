"use client";

export function AppLoading({
  label = "Sedang memuat data...",
  fullscreen = false,
  variant = "loading",
}: {
  label?: string;
  fullscreen?: boolean;
  variant?: "loading" | "empty" | "error";
}) {
  const isLoading = variant === "loading";

  return (
    <div
      className={fullscreen
        ? "relative flex min-h-dvh items-center justify-center bg-background px-4"
        : "relative flex min-h-28 items-center justify-center rounded-lg border bg-card px-4 py-6"
      }
      role="status"
      aria-live="polite"
    >
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className={`loader-shell ${variant}`}>
          {isLoading ? (
            <div className="loader-container" aria-hidden="true">
              <span className="dash first" />
              <span className="dash second" />
              <span className="dash third" />
              <span className="dash fourth" />
            </div>
          ) : (
            <span className="state-dot" aria-hidden="true" />
          )}
        </div>
        <p className={`mt-4 text-sm leading-relaxed ${variant === "error" ? "text-destructive" : "text-muted-foreground"}`}>{label}</p>
      </div>
      <span className="sr-only">{label}</span>
      <style jsx>{`
        .loader-shell {
          display: flex;
          min-height: 36px;
          align-items: center;
          justify-content: center;
        }

        .loader-container {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dash {
          margin: 0 10px;
          width: 28px;
          height: 10px;
          border-radius: 999px;
          background: var(--primary);
          box-shadow: 0 0 14px color-mix(in oklch, var(--primary) 35%, transparent);
        }

        .state-dot {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background:
            radial-gradient(circle at center, var(--background) 0 38%, transparent 39%),
            conic-gradient(var(--muted-foreground) 0deg 360deg);
        }

        .loader-shell.empty .state-dot {
          background:
            radial-gradient(circle at center, var(--background) 0 38%, transparent 39%),
            conic-gradient(color-mix(in oklch, var(--muted-foreground) 35%, transparent) 0deg 360deg);
        }

        .loader-shell.error .state-dot {
          border-color: color-mix(in oklch, var(--destructive) 30%, transparent);
          background:
            radial-gradient(circle at center, var(--background) 0 38%, transparent 39%),
            conic-gradient(var(--destructive) 0deg 360deg);
        }

        .first {
          margin-right: -12px;
          transform-origin: center left;
          animation: spin 3s linear infinite;
        }

        .second {
          transform-origin: center right;
          animation: spin2 3s linear infinite;
          animation-delay: 0.2s;
        }

        .third {
          transform-origin: center right;
          animation: spin3 3s linear infinite;
          animation-delay: 0.3s;
        }

        .fourth {
          transform-origin: center right;
          animation: spin4 3s linear infinite;
          animation-delay: 0.4s;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(360deg); }
          30% { transform: rotate(370deg); }
          35% { transform: rotate(360deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes spin2 {
          0% { transform: rotate(0deg); }
          20% { transform: rotate(0deg); }
          30% { transform: rotate(-180deg); }
          35% { transform: rotate(-190deg); }
          40% { transform: rotate(-180deg); }
          78% { transform: rotate(-180deg); }
          95% { transform: rotate(-360deg); }
          98% { transform: rotate(-370deg); }
          100% { transform: rotate(-360deg); }
        }

        @keyframes spin3 {
          0% { transform: rotate(0deg); }
          27% { transform: rotate(0deg); }
          40% { transform: rotate(180deg); }
          45% { transform: rotate(190deg); }
          50% { transform: rotate(180deg); }
          62% { transform: rotate(180deg); }
          75% { transform: rotate(360deg); }
          80% { transform: rotate(370deg); }
          85% { transform: rotate(360deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes spin4 {
          0% { transform: rotate(0deg); }
          38% { transform: rotate(0deg); }
          60% { transform: rotate(-360deg); }
          65% { transform: rotate(-370deg); }
          75% { transform: rotate(-360deg); }
          100% { transform: rotate(-360deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .dash {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

export default AppLoading;
