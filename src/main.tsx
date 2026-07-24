import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import LandingPage from './LandingPage.tsx';
import './index.css';

// Simple Native Router
const path = window.location.pathname;
const search = window.location.search;
const isProjector = search.includes('projector=true');

// Show landing page if on the root path and NOT in projector mode popup
const showLanding = (path === '/' || path === '') && !isProjector;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showLanding ? <LandingPage /> : <App />}
  </StrictMode>,
);
