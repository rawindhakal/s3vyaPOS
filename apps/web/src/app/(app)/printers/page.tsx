'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PRINTER_STATIONS, type PrinterStation } from '@s3vya/types';
import { getDesktop } from '@/lib/desktop';
import { getPrinterMap, setPrinterMap, listPrinters, printToStation, kotHtml } from '@/lib/print';

export default function PrintersPage() {
  const [printers, setPrinters] = useState<{ name: string; displayName?: string }[]>([]);
  const [map, setMap] = useState<Record<string, string>>({});
  const desktop = typeof window !== 'undefined' && !!getDesktop();

  useEffect(() => {
    setMap(getPrinterMap());
    listPrinters().then(setPrinters).catch(() => setPrinters([]));
  }, []);

  const save = (station: PrinterStation, device: string) => {
    const next = { ...map, [station]: device };
    setMap(next); setPrinterMap(next); toast.success(`${station} printer set`);
  };

  const test = (station: PrinterStation) =>
    printToStation(station, kotHtml({ title: 'TEST TICKET', station, items: [{ name: 'Test item', quantity: 1 }] }));

  return (
    <div className="p-6">
      <h1 className="mb-2 text-2xl font-bold">Printer setup</h1>
      <p className="mb-4 text-sm text-slate-500">
        Map each station to a printer. KOTs route to <b>Kitchen</b>/<b>Bar</b>; bills print to <b>Billing</b>.
        {!desktop && ' Printer detection & silent printing require the s3vyaPOS desktop app — in the browser these fall back to the print dialog.'}
      </p>

      <div className="card max-w-2xl divide-y">
        {PRINTER_STATIONS.map((station) => (
          <div key={station} className="flex flex-wrap items-center gap-3 p-4">
            <div className="w-28 font-semibold">{station}</div>
            <select className="input h-10 flex-1" value={map[station] ?? ''} onChange={(e) => save(station, e.target.value)}>
              <option value="">{desktop ? 'Select printer' : 'Browser print dialog'}</option>
              {printers.map((p) => <option key={p.name} value={p.name}>{p.displayName || p.name}</option>)}
            </select>
            <button className="btn-ghost" onClick={() => test(station)}>Test print</button>
          </div>
        ))}
      </div>

      {desktop && printers.length === 0 && (
        <p className="mt-3 text-sm text-amber-600">No printers detected on this machine.</p>
      )}
    </div>
  );
}
