'use client';

import { useEffect, useRef } from 'react';

interface Props {
  value: string;
  caption?: string;
  size?: number;
}

// Renders a QR code (bwip-js) to a canvas, with a print button.
export function QRCode({ value, caption, size = 6 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const bwipjs = (await import('bwip-js')).default;
      if (cancelled || !canvasRef.current) return;
      try {
        bwipjs.toCanvas(canvasRef.current, { bcid: 'qrcode', text: value, scale: size });
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [value, size]);

  const print = () => {
    const dataUrl = canvasRef.current?.toDataURL();
    if (!dataUrl) return;
    const w = window.open('', '_blank', 'width=400,height=480');
    if (!w) return;
    w.document.write(`<html><body style="text-align:center;font-family:sans-serif">
      ${caption ? `<h2>${caption}</h2>` : ''}
      <img src="${dataUrl}" style="width:280px;height:280px"/>
      <p style="font-size:12px;color:#555">Scan to view menu & order</p>
      <script>window.onload=()=>{window.print();window.close();}</script>
    </body></html>`);
    w.document.close();
  };

  return (
    <div className="space-y-3 text-center">
      <canvas ref={canvasRef} className="mx-auto" />
      {caption && <div className="text-sm font-medium">{caption}</div>}
      <p className="break-all text-xs text-slate-400">{value}</p>
      <button className="btn-primary" onClick={print}>Print QR</button>
    </div>
  );
}
