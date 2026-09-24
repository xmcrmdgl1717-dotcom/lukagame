import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { captureUtm } from './utils/utm';
import { installErrorReporter } from './utils/errorReporter';

// 捕获 UTM
captureUtm();

// 安装全局错误捕获
installErrorReporter();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
