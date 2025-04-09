
import React, { useState, useEffect, useRef } from "react"

const API_URL = process.env.REACT_APP_API_URL || ""
const AGENT_ID = process.env.REACT_APP_AGENT_ID || ""
const API_KEY = process.env.REACT_APP_API_KEY || ""


interface Message {
  role: "user" | "assistant"
  content: string
}

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState<string>("")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => { 
    createSession();
  }, [])

  useEffect(() => { 
    initChat();
  }, [sessionId])
  const createSession = async () => {
    try {
      const response = await fetch(`${API_URL}/agents/${AGENT_ID}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "app": "ragflow_serv",
          "apikey": API_KEY,
        },
        body: JSON.stringify({})
      })
      const data = await response.json()
      if (data.code === 0) {
        setSessionId(data.data.id)
      }
    } catch (error) {
      console.error("Error creating session:", error)
    }
  }

  const initChat = async () => {
    if(!sessionId) return; 
    try {
      const response = await fetch(`${API_URL}/agents/${AGENT_ID}/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "app": "ragflow_serv",
          "apikey": API_KEY,
        },
        body: JSON.stringify({
          question: "hi",
          stream: false,
          session_id: sessionId
        })
      })
      const data = await response.json()
      if (data.code === 0) {
        setMessages([{ role: "assistant", content: "已經為您連接上論證助理，可以開始進行溝通。" }])
        setMessages(prev => [...prev, { role: "assistant", content: data.data.answer }])
      }
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }
  const sendMessage = async () => {
    if (!input.trim()) return
    const userMessage: Message = { role: "user", content: input }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    try {
      const response = await fetch(`${API_URL}/agents/${AGENT_ID}/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "app": "ragflow_serv",
          "apikey": API_KEY,
        },
        body: JSON.stringify({
          question: input,
          stream: false,
          session_id: sessionId
        })
      })
      const data = await response.json()
      if (data.code === 0) {
        setMessages(prev => [...prev, { role: "assistant", content: data.data.answer }])
      }
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="chat-container" style={{ 
      width: "95%",
      height: "80%", 
      margin: "auto", 
      padding: "20px", 
      border: "1px solid #ddd", 
      borderRadius: "8px" 
      }}>
      <div className="chat-box" style={{ height: "100%", overflowY: "auto", padding: "10px", background: "#f9f9f9" }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ textAlign: msg.role === "user" ? "right" : "left", margin: "10px 0" }}>
            <div style={{
              display: "inline-block",
              padding: "8px 12px",
              borderRadius: "8px",
              background: msg.role === "user" ? "#007bff" : "#e5e5e5",
              color: msg.role === "user" ? "#fff" : "#000"
            }}>{msg.content}</div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <div className="chat-input" style={{ marginTop: "10px", display: "flex" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          style={{ flex: 1, padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
        />
        <button onClick={sendMessage} style={{ marginLeft: "5px", padding: "10px", background: "#007bff", color: "#fff", border: "none", borderRadius: "4px" }}>發送</button>
      </div>
    </div>
  )
}


export default Chatbot
