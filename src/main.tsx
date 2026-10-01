import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initUpdates } from './engine/updates';
import './styles/app.css';

initUpdates();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
