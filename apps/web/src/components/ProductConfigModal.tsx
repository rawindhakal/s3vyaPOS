'use client';

import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { money } from '@/lib/format';

export interface ConfigVariation { id: string; name: string; salePrice: string }
export interface ConfigModifier { id: string; name: string; price: string }
export interface ConfigProduct {
  id: string; sku: string; name: string; salePrice: string;
  hasVariations: boolean; variations: ConfigVariation[]; modifiers?: ConfigModifier[];
}

export interface ConfiguredItem {
  productId: string; sku: string; variationId?: string; modifierIds: string[]; name: string; unitPrice: number; note?: string;
}

export function ProductConfigModal({
  product, currency, onClose, onAdd, withNote = false,
}: {
  product: ConfigProduct | null;
  currency: string;
  onClose: () => void;
  onAdd: (item: ConfiguredItem) => void;
  withNote?: boolean;
}) {
  const [variationId, setVariationId] = useState<string | undefined>(undefined);
  const [mods, setMods] = useState<string[]>([]);
  const [note, setNote] = useState('');

  if (!product) return null;
  const modifiers = product.modifiers ?? [];
  const variation = product.variations.find((v) => v.id === variationId);
  const base = variation ? Number(variation.salePrice) : Number(product.salePrice);
  const selMods = modifiers.filter((m) => mods.includes(m.id));
  const modAdd = selMods.reduce((s, m) => s + Number(m.price), 0);
  const unitPrice = base + modAdd;
  const canAdd = !product.hasVariations || !!variationId;

  const reset = () => { setVariationId(undefined); setMods([]); setNote(''); };
  const add = () => {
    const suffix = selMods.length ? ` + ${selMods.map((m) => m.name).join(', ')}` : '';
    const name = (variation ? `${product.name} (${variation.name})` : product.name) + suffix;
    onAdd({ productId: product.id, sku: product.sku, variationId, modifierIds: mods, name, unitPrice, note: note.trim() || undefined });
    reset();
  };

  return (
    <Modal open={!!product} title={`Customize · ${product.name}`} onClose={() => { reset(); onClose(); }}>
      <div className="space-y-4">
        {product.hasVariations && (
          <div>
            <div className="mb-1 text-sm font-medium">Size</div>
            <div className="grid grid-cols-2 gap-2">
              {product.variations.map((v) => (
                <button key={v.id} onClick={() => setVariationId(v.id)}
                  className={`card p-3 text-left ${variationId === v.id ? 'ring-2 ring-brand' : 'hover:border-brand'}`}>
                  <div className="font-medium">{v.name}</div>
                  <div className="text-sm font-semibold text-brand">{money(Number(v.salePrice), currency)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {modifiers.length > 0 && (
          <div>
            <div className="mb-1 text-sm font-medium">Add-ons</div>
            <div className="space-y-1">
              {modifiers.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 ring-1 ring-slate-200 dark:ring-slate-700">
                  <span className="flex items-center gap-2">
                    <input type="checkbox" checked={mods.includes(m.id)}
                      onChange={(e) => setMods((p) => e.target.checked ? [...p, m.id] : p.filter((x) => x !== m.id))} />
                    {m.name}
                  </span>
                  <span className="text-sm text-slate-500">+{money(Number(m.price), currency)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {withNote && (
          <div>
            <div className="mb-1 text-sm font-medium">Note to kitchen</div>
            <input className="input" placeholder="e.g. no onions, extra spicy" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        )}

        <button className="btn-primary w-full" disabled={!canAdd} onClick={add}>
          Add · {money(unitPrice, currency)}
        </button>
      </div>
    </Modal>
  );
}
