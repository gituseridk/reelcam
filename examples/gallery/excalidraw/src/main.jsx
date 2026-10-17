import React from 'react';
import { createRoot } from 'react-dom/client';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

createRoot(document.getElementById('root')).render(
  <div style={{ height: '100vh' }}>
    <Excalidraw UIOptions={{ welcomeScreen: false }} />
  </div>,
);
