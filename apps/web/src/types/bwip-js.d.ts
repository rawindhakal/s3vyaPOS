// bwip-js v4 ships its own types but they aren't resolved under
// moduleResolution: bundler in this setup, so we declare the slice we use.
declare module 'bwip-js' {
  interface RenderOptions {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    width?: number;
    includetext?: boolean;
    textxalign?: 'offleft' | 'left' | 'center' | 'right' | 'offright' | 'justify';
    [key: string]: unknown;
  }
  const bwipjs: {
    toCanvas(canvas: HTMLCanvasElement | string, opts: RenderOptions): HTMLCanvasElement;
  };
  export default bwipjs;
}
