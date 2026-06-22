'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  onScan: (text: string) => void;
  onClose?: () => void;
}

// Camera barcode scanner using html5-qrcode. Requests the rear camera, scans,
// fires onScan with the decoded text, then stops the camera.
export function CameraScanner({ onScan, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const regionId = 's3vya-scan-region';

  useEffect(() => {
    let stopped = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const scanner = new Html5Qrcode(regionId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decoded: string) => {
            if (stopped) return;
            stopped = true;
            scanner
              .stop()
              .catch(() => undefined)
              .finally(() => onScan(decoded));
          },
          () => undefined,
        );
      } catch (e: any) {
        setError(e?.message ?? 'Unable to access camera');
      }
    })();

    return () => {
      const s = scannerRef.current;
      if (s) {
        s.stop().catch(() => undefined);
      }
    };
  }, [onScan]);

  return (
    <div className="space-y-3">
      <div
        id={regionId}
        ref={ref}
        className="mx-auto w-full max-w-sm overflow-hidden rounded-lg bg-black"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {onClose && (
        <button className="btn-ghost w-full" onClick={onClose}>
          Stop scanner
        </button>
      )}
    </div>
  );
}
