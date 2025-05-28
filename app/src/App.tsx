// App.tsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import ChatBot from './components/chat'
import Helper from './components/helper'
import SimpleChatPage from './pages/SimpleChatPage'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<SimpleChatPage />} />
        <Route path="/demo" element={<ChatBot />} />
        <Route path="/help" element={<Helper />} />
      </Routes>
    </div>
  )
}

export default App
