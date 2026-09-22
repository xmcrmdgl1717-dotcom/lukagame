import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { captureUtm } from './utils/utm';

// 在应用启动前，立即捕获 URL 中的 UTM 参数并存入 localStorage
captureUtm();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
