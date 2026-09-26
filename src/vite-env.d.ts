/// <reference types="vite/client" />

/**
 * Vite 的 `?url` 匯入：把資源檔打包並回傳其公開網址。
 * pdf.js 的 worker 透過此機制自架，避免依賴第三方 CDN
 * （正式環境 CSP 為 worker-src 'self' blob:，外部 CDN 會被擋下）。
 */
declare module '*?url' {
  const url: string;
  export default url;
}
