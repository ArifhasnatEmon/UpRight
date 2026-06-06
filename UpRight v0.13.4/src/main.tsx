import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const isOverlayMode = window.location.hash === '#/overlay';

if (isOverlayMode) {
  import('./pages/Overlay').then(({ Overlay }) => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <Overlay />
      </StrictMode>,
    );
  });
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
