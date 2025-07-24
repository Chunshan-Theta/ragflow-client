// App.tsx
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Settings from './components/Settings'
import NotebookLMPage from './pages/NotebookLMPage'
import InitAssistantPage from './pages/InitAssistantPage'
import ChatPage from './pages/ChatPage'
import DocumentManagementPage from './pages/DocumentManagementPage'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<Settings />} />
        <Route path="/notebook" element={<NotebookLMPage />} />
        <Route path="/init-assistant" element={<InitAssistantPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/documents" element={<DocumentManagementPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
