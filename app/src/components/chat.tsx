import React, { useState, useEffect, useRef } from "react"

// 訊息類型定義
interface Message {
  role: "user" | "assistant"
  content: string
}

// 設定頁元件
const Settings: React.FC<{
  apiUrl: string
  agentId: string
  apiKey: string
  onSave: (url: string, id: string, key: string) => void
}> = ({ apiUrl, agentId, apiKey, onSave }) => {
  const [url, setUrl] = useState(apiUrl)
  const [id, setId] = useState(agentId)
  const [key, setKey] = useState(apiKey)

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>⚙️ API 設定</h2>
      <div style={styles.inputGroup}>
        <label style={styles.label}>API URL</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} style={styles.input} />
      </div>
      <div style={styles.inputGroup}>
        <label style={styles.label}>Agent ID</label>
        <input value={id} onChange={(e) => setId(e.target.value)} style={styles.input} />
      </div>
      <div style={styles.inputGroup}>
        <label style={styles.label}>API Key</label>
        <input value={key} onChange={(e) => setKey(e.target.value)} style={styles.input} />
      </div>
      <button onClick={() => onSave(url, id, key)} style={styles.primaryButton}>💾 儲存設定</button>
    </div>
  )
}

const Chatbot: React.FC = () => {
  const [apiUrl, setApiUrl] = useState<string>(process.env.REACT_APP_API_URL || "")
  const [agentId, setAgentId] = useState<string>(process.env.REACT_APP_AGENT_ID || "")
  const [apiKey, setApiKey] = useState<string>(process.env.REACT_APP_API_KEY || "")
  const [showSettings, setShowSettings] = useState<boolean>(false)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState<string>("")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const [isComposing, setIsComposing] = useState(false)


  useEffect(() => { createSession() }, [apiUrl, agentId, apiKey])
  useEffect(() => { initChat() }, [sessionId])
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const createSession = async () => {
    try {
      const response = await fetch(`${apiUrl}/agents/${agentId}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "app": "ragflow_serv",
          "apikey": apiKey,
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
    if (!sessionId) return
    try {
      const response = await fetch(`${apiUrl}/agents/${agentId}/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "app": "ragflow_serv",
          "apikey": apiKey,
        },
        body: JSON.stringify({
          question: "hi",
          stream: false,
          session_id: sessionId
        })
      })
      const data = await response.json()
      if (data.code === 0) {
        setMessages([
          { role: "assistant", content: "已經為您連接上論證助理，可以開始進行溝通。" },
          { role: "assistant", content: data.data.answer }
        ])
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
      const response = await fetch(`${apiUrl}/agents/${agentId}/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "app": "ragflow_serv",
          "apikey": apiKey,
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

  if (showSettings) {
    return (
      <div style={styles.wrapper}>
        <Settings
          apiUrl={apiUrl}
          agentId={agentId}
          apiKey={apiKey}
          onSave={(url, id, key) => {
            setApiUrl(url)
            setAgentId(id)
            setApiKey(key)
            setShowSettings(false)
          }}
        />
      </div>
    )
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between" }}>
          <h2 style={styles.title}>💬 聊天助理</h2>
          <button onClick={() => setShowSettings(true)} style={styles.secondaryButton}>⚙️ 設定</button>
        </div>
        <div style={styles.chatBox}>
          {messages.map((msg, index) => (
            <div key={index} style={{ textAlign: msg.role === "user" ? "right" : "left", margin: "10px 0" }}>
              <div style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: "12px",
                background: msg.role === "user" ? "#4f46e5" : "#e2e8f0",
                color: msg.role === "user" ? "#fff" : "#111"
              }}>{msg.content}</div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div style={styles.inputRow}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}      // 開始組字
            onCompositionEnd={() => setIsComposing(false)}       // 組字完成
            onKeyDown={(e) => {
                if (e.key === "Enter" && !isComposing) {
                  sendMessage()
                }
              }}
            style={styles.input}
            placeholder="輸入訊息..."
          />
          <button onClick={sendMessage} style={styles.primaryButton}>發送</button>
        </div>
      </div>
    </div>
  )
}

// 樣式統一設計
const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    fontFamily: "'Segoe UI', sans-serif",
    background: "#f0f4f8",
    height: "100%",
    padding: "auto",
    margin: "0 auto",
    alignItems: "flex-start"
  },
  card: {
    width: "88%",
    maxWidth: "600px",
    background: "#fff",
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    padding: "24px",
    margin: "0 auto"
  },
  title: {
    fontSize: "20px",
    fontWeight: 600,
    marginBottom: "16px"
  },
  chatBox: {
    height: "400px",
    overflowY: "auto",
    background: "#f8fafc",
    padding: "10px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    marginBottom: "16px"
  },
  inputRow: {
    display: "flex",
    gap: "8px"
  },
  input: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px"
  },
  primaryButton: {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    background: "#4f46e5",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer"
  },
  secondaryButton: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    fontWeight: 500,
    cursor: "pointer"
  },
  inputGroup: {
    marginBottom: "12px"
  },
  label: {
    display: "block",
    fontSize: "14px",
    marginBottom: "4px",
    fontWeight: 500
  }
}

export default Chatbot
