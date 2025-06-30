// App.tsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Settings from './components/Settings'
import NotebookLMPage from './pages/NotebookLMPage'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<Settings />} />
        <Route path="/notebook" element={<NotebookLMPage />} />
      </Routes>
    </div>
  )
}

export default App
