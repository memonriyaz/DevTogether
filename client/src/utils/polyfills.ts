// Polyfills for Node.js built-ins
if (typeof window !== 'undefined') {
  (window as any).global = window;
  (window as any).process = { env: {} };
  (window as any).Buffer = (window as any).Buffer || require('buffer').Buffer;
}

export {};
