// App.tsx
import React from 'react'
import ChatBot from './components/chat'
import Helper from './components/helper'

function App() {
  return (
  <div>
    <div className="bg-gray-50 items-center justify-center" style={{ height: "100vh" }}>
      <ChatBot />
    </div>
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Helper />
    </div>
  </div>
  )
}

export default App
