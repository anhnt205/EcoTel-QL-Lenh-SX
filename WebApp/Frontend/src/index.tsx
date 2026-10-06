import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import './fixLeafletIcon';
import BrandingProvider from './branding/BrandingProvider';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
const queryClient = new QueryClient();

// BrandingProvider vừa lấy cấu hình giao diện (logo, tên, màu chủ đạo) vừa dựng theme MUI + antd,
// nên phải nằm TRONG QueryClientProvider (trước đây ThemeProvider/ConfigProvider là theme cố định).
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrandingProvider>
        <App />
      </BrandingProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

reportWebVitals();
