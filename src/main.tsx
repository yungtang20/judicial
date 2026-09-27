import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/*
      全域錯誤邊界：沒有它時，任一元件在 render 中拋出例外，
      React 會卸載整棵樹，使用者只會看到完全空白的畫面。
    */}
    <ErrorBoundary 區段="應用程式">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
