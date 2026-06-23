'use client';

import type { PrinterStation } from '@s3vya/types';
import { getDesktop } from './desktop';

const KEY = 's3vya-printers';

export function getPrinterMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
export function setPrinterMap(map: Record<string, string>) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

export async function listPrinters() {
  const d = getDesktop();
  return d?.getPrinters ? await d.getPrinters() : [];
}

// Print HTML to the printer mapped for a station; falls back to the browser dialog.
export async function printToStation(station: PrinterStation, html: string) {
  const d = getDesktop();
  const device = getPrinterMap()[station];
  if (d?.printHtml) {
    const res = await d.printHtml(html, device);
    if (!res.ok) console.warn('print failed', res.error);
    return;
  }
  const w = window.open('', '_blank', 'width=340,height=640');
  if (!w) return;
  w.document.write(html + '<script>window.onload=()=>{window.print();window.close();}<\/script>');
  w.document.close();
}

const wrap = (title: string, rows: string, footer = '') => `<!doctype html><html><head><meta charset="utf-8">
<style>*{font-family:monospace;font-size:13px}body{padding:8px;width:280px}h3{text-align:center;margin:4px 0}
table{width:100%;border-collapse:collapse}td{padding:2px 0;vertical-align:top}.r{text-align:right}.b{font-weight:bold}
hr{border:none;border-top:1px dashed #000;margin:6px 0}</style></head><body>
<h3>${title}</h3>${rows}${footer}</body></html>`;

export function kotHtml(opts: { title: string; station: string; items: { name: string; quantity: number; note?: string }[] }) {
  const rows = opts.items.map((i) => `<tr><td class="b">${i.quantity} ×</td><td>${i.name}${i.note ? `<br><i>${i.note}</i>` : ''}</td></tr>`).join('');
  return wrap(`KOT · ${opts.station}`, `<div>${opts.title}</div><div>${new Date().toLocaleString()}</div><hr/><table>${rows}</table>`);
}

export function billHtml(opts: { shopName: string; currency: string; sale: any }) {
  const m = (n: number) => `${opts.currency} ${Number(n).toFixed(2)}`;
  const items = (opts.sale.items || []).map((i: any) =>
    `<tr><td>${i.name} × ${Number(i.quantity)}</td><td class="r">${m(Number(i.lineTotal))}</td></tr>`).join('');
  const s = opts.sale;
  const line = (l: string, v: number) => `<tr><td>${l}</td><td class="r">${m(v)}</td></tr>`;
  const extra = [
    Number(s.discount) ? line('Discount', -Number(s.discount)) : '',
    Number(s.serviceCharge) ? line('Service charge', Number(s.serviceCharge)) : '',
    line('Tax', Number(s.tax)),
    Number(s.tip) ? line('Tip', Number(s.tip)) : '',
    Number(s.roundOff) ? line('Round off', Number(s.roundOff)) : '',
  ].join('');
  return wrap(opts.shopName,
    `<div>Invoice: ${s.invoiceNo}</div><div>${new Date(s.createdAt || Date.now()).toLocaleString()}</div><hr/>
     <table>${items}</table><hr/><table>${extra}
     <tr class="b"><td>TOTAL</td><td class="r">${m(Number(s.total))}</td></tr></table><hr/>
     <div style="text-align:center">Thank you!</div>`);
}
