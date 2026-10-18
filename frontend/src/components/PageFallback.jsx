import React from 'react';

/** Suspense fallback while a lazily loaded route chunk downloads. */
export default function PageFallback() {
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center text-white/80"
      role="status"
    >
      Loading…
    </div>
  );
}
