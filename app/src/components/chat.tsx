import React, { useState, useEffect, useRef } from "react"
import MarkdownIt from 'markdown-it'

// 訊息類型定義
interface Message {
  role: "user" | "assistant"
  content: string
  references?: Reference[]
}

interface Reference {
  content: string
  document_name: string
  positions: number[][]
  document_id?: string
  dataset_id?: string
  id?: string
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
  const [streamingContent, setStreamingContent] = useState<string>("")
  const [streamingReferences, setStreamingReferences] = useState<Reference[]>([])
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const [isComposing, setIsComposing] = useState(false)
  const [selectedReference, setSelectedReference] = useState<{
    ref: Reference | null,
    anchor: { x: number, y: number } | null,
    chunkDetail: any,
    loading: boolean,
    error: string | null
  }>({ ref: null, anchor: null, chunkDetail: null, loading: false, error: null })
  const [showReferences, setShowReferences] = useState<{ [key: number]: boolean }>({})

  const md = new MarkdownIt({ breaks: true });

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

  const formatMessageWithReferences = (content: string, references: Reference[]) => {
    // 1. 先做 markdown 轉 html
    let html = md.render(content || '');

    // 2. 再做 citation 替換
    html = html.replace(/##(\d+)\$\$/g, (match: string, index: string) => {
      const refIndex = parseInt(index, 10);
      if (Array.isArray(references) && refIndex >= 0 && refIndex < references.length && references[refIndex]) {
        const ref = references[refIndex];
        return `<span class="citation-ref" data-ref-index="${refIndex}" data-dataset-id="${ref.dataset_id || ''}" data-document-id="${ref.document_id || ''}" data-chunk-id="${ref.id || ''}" style="color: #4f46e5; cursor: pointer; user-select: none;">[${index}]</span>`;
      }
      return `<span style="color: #f87171;">[?]</span>`;
    });
    return html;
  }

  const sendMessage = async () => {
    if (!input.trim()) return
    const userMessage: Message = { role: "user", content: input }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setStreamingContent("")
    setStreamingReferences([])
    
    try {
      console.log('Sending request with:', {
        question: input,
        stream: true,
        session_id: sessionId
      })

      const response = await fetch(`${apiUrl}/agents/${agentId}/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "app": "ragflow_serv",
          "apikey": apiKey,
        },
        body: JSON.stringify({
          question: input,
          stream: true,
          session_id: sessionId
        })
      })

      if (!response.ok) {
        throw new Error('Network response was not ok')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ""
      let latestReferences: Reference[] = []

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value)
          console.log('Received chunk:', chunk)
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.trim() === '') continue
            try {
              const jsonStr = line.replace(/^data:/, '').trim()
              if (!jsonStr) continue
              
              const data = JSON.parse(jsonStr)
              console.log('Parsed data:', data)
              
              if (data.code === 0) {
                if (data.data.answer) {
                  assistantMessage = data.data.answer
                  console.log('Current message:', assistantMessage)
                  
                  if (data.data.reference?.chunks) {
                    latestReferences = data.data.reference.chunks.map((chunk: any) => ({
                      content: chunk.content,
                      document_name: chunk.document_name,
                      positions: chunk.positions,
                      dataset_id: chunk.dataset_id,
                      document_id: chunk.document_id,
                      id: chunk.id
                    }))
                    setStreamingReferences(latestReferences.filter(Boolean))
                  }
                  setStreamingContent(formatMessageWithReferences(assistantMessage, latestReferences))
                  await new Promise(resolve => setTimeout(resolve, 0))
                }
              }
            } catch (e) {
              console.error('Error parsing chunk:', e)
            }
          }
        }
      }

      if (assistantMessage) {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: assistantMessage,
          references: latestReferences
        }])
      }
      setStreamingContent("")
      setStreamingReferences([])
    } catch (error) {
      console.error("Error sending message:", error)
      setMessages(prev => [...prev, { role: "assistant", content: "抱歉，發生錯誤，請稍後再試。" }])
    }
  }

  // 彈窗關閉
  const closeReferenceModal = () => setSelectedReference({ ref: null, anchor: null, chunkDetail: null, loading: false, error: null })

  // 點擊引用時觸發
  const handleReferenceClick = async (ref: Reference, event: React.MouseEvent) => {
    event.stopPropagation()
    // 先顯示本地內容
    setSelectedReference({ ref, anchor: { x: event.clientX, y: event.clientY }, chunkDetail: null, loading: true, error: null })
    // 如果有 id, document_id, dataset_id 才查 chunk 詳細
    if (ref.id && ref.document_id && ref.dataset_id) {
      console.log('Fetching chunk detail for:', ref)
      setSelectedReference(prev => ({ ...prev, loading: false, chunkDetail: `<a href="https://ragflow.lazyinwork.com/document/${ref.document_id}?ext=pdf&prefix=document" target="_blank">查看原始資料</a>` }))

    } else {
      console.log('No chunk detail available for:', ref)
      setSelectedReference(prev => ({ ...prev, loading: false }))
    }
  }

  // 事件代理，處理 citation-ref 點擊
  const chatBoxRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      console.log('Handling click event')
      const target = e.target as HTMLElement
      if (target.classList.contains('citation-ref')) {
        console.log('Citation ref clicked')
        const refIndex = parseInt(target.getAttribute('data-ref-index') || '-1')
        const dataset_id = target.getAttribute('data-dataset-id') || undefined
        const document_id = target.getAttribute('data-document-id') || undefined
        const id = target.getAttribute('data-chunk-id') || undefined
        let references: Reference[] = []
        if (streamingContent && streamingReferences.length > 0) {
          references = streamingReferences
        } else {
          for (const msg of messages) {
            if (msg.references && msg.references.length > refIndex) {
              references = msg.references
              break
            }
          }
        }
        if (references && references[refIndex]) {
          console.log('Found reference:', references[refIndex])
          const ref = { ...references[refIndex], dataset_id, document_id, id }
          handleReferenceClick(ref, e as any)
        }
      }
    }
    const box = chatBoxRef.current
    if (box) box.addEventListener('click', handler)
    return () => { if (box) box.removeEventListener('click', handler) }
  }, [messages, streamingContent, streamingReferences])

  // 切換參考資料顯示/收合
  const toggleReferences = (index: number) => {
    setShowReferences(prev => ({ ...prev, [index]: !prev[index] }))
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
        <div style={styles.chatBox} ref={chatBoxRef}>
          {messages.map((msg, index) => (
            <div key={index} style={{ textAlign: msg.role === "user" ? "right" : "left", margin: "10px 0" }}>
              <div style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: "12px",
                backgroundColor: msg.role === "user" ? "#4f46e5" : "#f1f5f9",
                color: msg.role === "user" ? "#fff" : "#111"
              }}>
                <div dangerouslySetInnerHTML={{ __html: formatMessageWithReferences(msg.content, msg.references || []) }} />
                {msg.references && msg.references.length > 0 && (
                  <div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
                    <button
                      onClick={() => toggleReferences(index)}
                      style={{
                        background: showReferences[index] ? '#e0e7ff' : '#f1f5f9',
                        color: '#4f46e5',
                        border: 'none',
                        borderRadius: 6,
                        padding: '2px 10px',
                        fontSize: 12,
                        cursor: 'pointer',
                        marginBottom: 4
                      }}
                    >
                      {showReferences[index] ? '收合參考資料' : '展開參考資料'}
                    </button>
                    {showReferences[index] && (
                      <div>
                        <div style={{ fontWeight: "bold", marginBottom: "5px" }}>參考資料：</div>
                        {msg.references.map((ref, refIndex) => (
                          <div key={refIndex} style={{ marginBottom: "5px" }}>
                            <div style={{ fontWeight: "500" }}>{ref.document_name}</div>
                            <div style={{ color: "#888" }}>{ref.content}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {streamingContent && (
            <div style={{ textAlign: "left", margin: "10px 0" }}>
              <div style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: "12px",
                backgroundColor: "#f1f5f9",
                color: "#111"
              }}>
                <div dangerouslySetInnerHTML={{ __html: formatMessageWithReferences(streamingContent, streamingReferences) }} />
                {streamingReferences.length > 0 && (
                  <div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
                    <div style={{ fontWeight: "bold", marginBottom: "5px" }}>參考資料：</div>
                    {streamingReferences.map((ref, refIndex) => (
                      <div key={refIndex} style={{ marginBottom: "5px" }}>
                        <div style={{ fontWeight: "500" }}>{ref.document_name}</div>
                        <div style={{ color: "#888" }}>{ref.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
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
        {/* Reference Modal/Popover */}
        {selectedReference.ref && selectedReference.anchor && (
          <div style={{
            position: 'fixed',
            left: selectedReference.anchor.x + 10,
            top: selectedReference.anchor.y + 10,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 9999,
            minWidth: 320,
            maxWidth: 480,
            padding: 16
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>引用內容</div>
            <div style={{ color: '#333', marginBottom: 8 }}>{selectedReference.ref.content}</div>
            {selectedReference.loading && <div style={{ color: '#888' }}>載入詳細內容中...</div>}
            {selectedReference.error && <div style={{ color: 'red' }}>{selectedReference.error}</div>}
            {selectedReference.chunkDetail && (
              <div style={{ marginTop: 8 }}>
                <a href={`https://ragflow.lazyinwork.com/document/${selectedReference.ref.document_id}?ext=pdf&prefix=document`} target="_blank">查看詳細內容</a>
              </div>
            )}
            <div style={{ textAlign: 'right', marginTop: 12 }}>
              <button onClick={closeReferenceModal} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer' }}>關閉</button>
            </div>
          </div>
        )}
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
