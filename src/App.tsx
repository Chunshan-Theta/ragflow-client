// App.tsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Settings from './components/Settings'
import NotebookLMPage from './pages/NotebookLMPage'
import PlaygroundPage from './pages/PlaygroundPage'
import ChatPage from './pages/ChatPage'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<Settings />} />
        <Route path="/notebook" element={<NotebookLMPage />} />
        <Route path="/playground" element={<PlaygroundPage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
    </div>
  )
}

export default App
