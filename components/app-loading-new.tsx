"use client";

export function AppLoading({
  label = "Sedang memuat data...",
  fullscreen = false,
}: {
  label?: string;
  fullscreen?: boolean;
}) {
  return (
    <div
      className={fullscreen
        ? "relative flex min-h-dvh items-center justify-center bg-background"
        : "relative flex min-h-28 items-center justify-center rounded-lg border bg-card"
      }
      role="status"
      aria-live="polite"
    >
      <div className="loader-wrap">
        <div className="loader-container">
          <div className="dash first" />
          <div className="dash second" />
          <div className="dash third" />
          <div className="dash fourth" />
        </div>
        <p className="mt-5 text-sm text-muted-foreground">{label}</p>
      </div>
      <span className="sr-only">{label}</span>
      <style jsx>{`
        .loader-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .loader-container {
          display: flex;
        }

        .dash {
          margin: 0 15px;
          width: 35px;
          height: 15px;
          border-radius: 8px;
          background: rgb(82, 159, 246);
          box-shadow: rgb(82, 159, 246) 0 0 15px 0;
        }

        .first {
          margin-right: -18px;
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
      `}</style>
    </div>
  );
}

export default AppLoading;
