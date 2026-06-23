'use client';

export interface DesktopBridge {
  isDesktop: boolean;
  cashier?: boolean;
  platform?: string;
  getPrinters?: () => Promise<{ name: string; displayName?: string; isDefault?: boolean }[]>;
  printHtml?: (html: string, deviceName?: string) => Promise<{ ok: boolean; error?: string }>;
}

export function getDesktop(): DesktopBridge | null {
  if (typeof window === 'undefined') return null;
  return (window as any).s3vyaDesktop ?? null;
}

// Cashier mode = running inside the desktop shell, or ?mode=cashier for testing.
export function isCashierMode(): boolean {
  if (typeof window === 'undefined') return false;
  const d = getDesktop();
  if (d?.cashier) return true;
  return new URLSearchParams(window.location.search).get('mode') === 'cashier';
}
