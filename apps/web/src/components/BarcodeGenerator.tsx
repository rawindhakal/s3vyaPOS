'use client';

import { useEffect, useRef } from 'react';

interface Props {
  value: string;
  label?: string;
}

// Renders a Code128 barcode for an SKU/value onto a canvas using bwip-js,
// with a Print button. Used when a product has no manufacturer barcode.
export function BarcodeGenerator({ value, label }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const bwipjs = (await import('bwip-js')).default;
      if (cancelled || !canvasRef.current) return;
      try {
        bwipjs.toCanvas(canvasRef.current, {
          bcid: 'code128',
          text: value,
          scale: 3,
          height: 12,
          includetext: true,
          textxalign: 'center',
        });
      } catch {
        /* invalid value — ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value]);

  const print = () => {
    const dataUrl = canvasRef.current?.toDataURL();
    if (!dataUrl) return;
    const w = window.open('', '_blank', 'width=400,height=300');
    if (!w) return;
    w.document.write(
      `<html><body style="text-align:center;font-family:sans-serif">
        ${label ? `<h3>${label}</h3>` : ''}
        <img src="${dataUrl}" style="max-width:100%"/>
        <script>window.onload=()=>{window.print();window.close();}</script>
      </body></html>`,
    );
    w.document.close();
  };

  return (
    <div className="space-y-3 text-center">
      <canvas ref={canvasRef} className="mx-auto" />
      <button className="btn-primary" onClick={print}>
        Print barcode
      </button>
    </div>
  );
}
