import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import DashboardPage from './pages/DashboardPage/DashboardPage.tsx'
import AgentsPage from './pages/AgentsPage/AgentsPage.tsx'
import HistoryPage from './pages/HistoryPage/HistoryPage.tsx'
import DataExplorerPage from './pages/DataExplorerPage/DataExplorerPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/trade-history" element={<HistoryPage />} />
        <Route path="/data-explorer" element={<DataExplorerPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
