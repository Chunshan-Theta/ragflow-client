// App.tsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import SimpleChat from './components/SimpleChat'
import Helper from './components/helper'
import SimpleChatPage from './pages/SimpleChatPage'
import WelcomePage from './pages/WelcomePage'
import Settings from './components/Settings'
import ChatInterface from './components/ChatInterface'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/simple" element={<SimpleChatPage />} />
        <Route path="/demo" element={<SimpleChat />} />
        <Route path="/help" element={<Helper />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/chat" element={<ChatInterface />} />
      </Routes>
    </div>
  )
}

export default App
