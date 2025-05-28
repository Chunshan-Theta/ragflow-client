import React, { useState, useEffect, useRef } from "react"
import MarkdownIt from 'markdown-it'

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

interface Settings {
  apiUrl: string
  agentId: string
  apiKey: string
}

interface Agent {
  id: string
  title: string
  description: string | null
  avatar: string | null
  create_date: string
  update_date: string
}

const SimpleChat: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    apiUrl: "https://ragflow.lazyinwork.com",
    agentId: "",
    apiKey: "ragflow-U0YmNjMDkyZWU3MTExZWZhZTYxMDI0Mm"
  })

  const [showSettingsForm, setShowSettingsForm] = useState(true)

  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>("")
  const [settingsStep, setSettingsStep] = useState<'credentials' | 'agent'>('credentials')
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const [isResetHovered, setIsResetHovered] = useState(false);

  const fetchAgents = async () => {
    try {
      const response = await fetch(`${settings.apiUrl}/api/v1/agents`.replace(/([^:]\/)\/+/g, "$1"), {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
      const data = await response.json()
      if (data.code === 0 && Array.isArray(data.data)) {
        setAgents(data.data)
        setSettingsStep('agent')
      } else {
        alert("No agents available. Please check your credentials.")
      }
    } catch (error) {
      console.error("Error fetching agents:", error)
      alert("Failed to fetch agents. Please check your API URL and Key.")
    }
  }

  const saveCredentials = (e: React.FormEvent) => {
    e.preventDefault()
    fetchAgents()
  }

  const updateAgentId = () => {
    setSettings(prev => ({ ...prev, agentId: selectedAgent }))
  }

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


  useEffect(() => { 
    if (sessionId) {
      sendMessage("hi", true) 
      setShowSettingsForm(false);
    }
  }, [sessionId])

  useEffect(() => { 
    if (settings.agentId && settings.apiUrl && settings.apiKey) {
      createSession();
    }
  }, [settings.agentId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const createSession = async () => {
    if (!settings.apiUrl || !settings.apiKey || !settings.agentId) return alert(`請先設定API URL、API Key和助理ID ${settings.apiUrl} ${settings.apiKey} ${settings.agentId}`);
    try {
      const response = await fetch(`${settings.apiUrl}/api/v1/agents/${settings.agentId}/sessions`.replace(/([^:]\/)\/+/g, "$1"), {
        method: "POST",
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Access-Control-Allow-Origin': '*'
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

  const formatMessageWithReferences = (content: string, references: Reference[]) => {
    let html = md.render(content || '');
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

  const sendMessage = async (message: string = input.trim(), isInitial: boolean = false) => {
    if (!message) return
    if (!sessionId) return
    if (!isInitial) {
      const userMessage: Message = { role: "user", content: message }
      setMessages(prev => [...prev, userMessage])
      setInput("")
    }
    setStreamingContent("")
    setStreamingReferences([])
    
    try {
      const response = await fetch(`${settings.apiUrl}/api/v1/agents/${settings.agentId}/completions`.replace(/([^:]\/)\/+/g, "$1"), {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Authorization": `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          question: message,
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
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.trim() === '') continue
            try {
              const jsonStr = line.replace(/^data:/, '').trim()
              if (!jsonStr) continue
              
              const data = JSON.parse(jsonStr)
              
              if (data.code === 0) {
                if (data.data.answer) {
                  assistantMessage = data.data.answer
                  
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
        if (isInitial) {
          setMessages([
            { role: "assistant", content: "已經為您連接上論證助理，可以開始進行溝通。" },
            { role: "assistant", content: assistantMessage, references: latestReferences }
          ])
        } else {
          setMessages(prev => [...prev, { 
            role: "assistant", 
            content: assistantMessage,
            references: latestReferences
          }])
        }
      }
      setStreamingContent("")
      setStreamingReferences([])
    } catch (error) {
      console.error("Error sending message:", error)
      setMessages(prev => [...prev, { role: "assistant", content: "抱歉，發生錯誤，請稍後再試。" }])
    }
  }

  const closeReferenceModal = () => setSelectedReference({ ref: null, anchor: null, chunkDetail: null, loading: false, error: null })

  const handleReferenceClick = async (ref: Reference, event: React.MouseEvent) => {
    event.stopPropagation()
    setSelectedReference({ ref, anchor: { x: event.clientX, y: event.clientY }, chunkDetail: null, loading: true, error: null })
    if (ref.id && ref.document_id && ref.dataset_id) {
      setSelectedReference(prev => ({ ...prev, loading: false, chunkDetail: `<a href="https://ragflow.lazyinwork.com/document/${ref.document_id}?ext=pdf&prefix=document" target="_blank">查看原始資料</a>` }))
    } else {
      setSelectedReference(prev => ({ ...prev, loading: false }))
    }
  }

  const chatBoxRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('citation-ref')) {
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
          const ref = { ...references[refIndex], dataset_id, document_id, id }
          handleReferenceClick(ref, e as any)
        }
      }
    }
    const box = chatBoxRef.current
    if (box) box.addEventListener('click', handler)
    return () => { if (box) box.removeEventListener('click', handler) }
  }, [messages, streamingContent, streamingReferences])

  const toggleReferences = (index: number) => {
    setShowReferences(prev => ({ ...prev, [index]: !prev[index] }))
  }

  const resetSettings = () => {
    setSettings({
      apiUrl: "https://ragflow.lazyinwork.com",
      agentId: "",
      apiKey: "ragflow-U0YmNjMDkyZWU3MTExZWZhZTYxMDI0Mm"
    })
    setShowSettingsForm(true)
    setSettingsStep('credentials')
    setMessages([])
    setSessionId(null)
  }

  const handleSendMessage = () => {
    sendMessage(input.trim(), false);
  }

  return (
    <div style={styles.wrapper}>
      {showSettingsForm ? (
        <div style={styles.card}>
          <h2 style={styles.title}>⚙️ 設定</h2>
          {settingsStep === 'credentials' ? (
            <form onSubmit={saveCredentials} style={styles.settingsForm}>
              <div style={styles.formGroup}>
                <label>API URL:</label>
                <input
                  type="text"
                  value={settings.apiUrl}
                  onChange={(e) => setSettings(prev => ({ ...prev, apiUrl: e.target.value }))}
                  style={styles.input}
                  required
                  placeholder="https://your-api-url.com"
                />
              </div>
              <div style={styles.formGroup}>
                <label>API Key:</label>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                  style={styles.input}
                  required
                  placeholder="Enter your API key"
                />
              </div>
              <button type="submit" style={styles.primaryButton}>下一步</button>
            </form>
          ) : (
            <div style={styles.settingsForm}>
              <h3 style={styles.subtitle}>選擇助理</h3>
              <div style={styles.agentGrid}>
                {agents.map(agent => (
                  <div 
                    key={agent.id} 
                    style={{
                      ...styles.agentCard,
                      ...(selectedAgent === agent.id ? styles.selectedAgentCard : {}),
                      ...(hoveredAgentId === agent.id ? {
                        borderColor: "#4f46e5",
                        transform: "translateY(-2px)"
                      } : {})
                    }}
                    onClick={() => setSelectedAgent(agent.id)}
                    onMouseEnter={() => setHoveredAgentId(agent.id)}
                    onMouseLeave={() => setHoveredAgentId(null)}
                  >
                    <div style={styles.agentName}>{agent.title}</div>
                    {agent.description && (
                      <div style={styles.agentDescription}>{agent.description}</div>
                    )}
                    <div style={styles.agentDate}>
                      Created: {new Date(agent.create_date).toLocaleDateString()}
                      <br />
                      Updated: {new Date(agent.update_date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={updateAgentId} 
                style={{
                  ...styles.primaryButton,
                  marginTop: "20px",
                  width: "100%"
                }}
                disabled={!selectedAgent}
              >
                開始聊天
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={styles.card}>
          <div style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={styles.title}>💬 聊天助理</h2>
            <button 
              onClick={resetSettings}
              onMouseEnter={() => setIsResetHovered(true)}
              onMouseLeave={() => setIsResetHovered(false)}
              style={{
                ...styles.secondaryButton,
                padding: "6px 12px",
                fontSize: "12px",
                ...(isResetHovered ? {
                  background: "#f8fafc",
                  border: "1px solid #4f46e5"
                } : {})
              }}
            >
              重設設定
            </button>
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
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={(e) => {
                  if (e.key === "Enter" && !isComposing) {
                    handleSendMessage()
                  }
                }}
              style={styles.input}
              placeholder="輸入訊息..."
            />
            <button onClick={handleSendMessage} style={styles.primaryButton}>發送</button>
          </div>
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
                  <a 
                    href={`https://ragflow.lazyinwork.com/document/${selectedReference.ref.document_id}?ext=pdf&prefix=document`} 
                    target="_blank" 
                    rel="noreferrer noopener"
                  >
                    查看詳細內容
                  </a>
                </div>
              )}
              <div style={{ textAlign: 'right', marginTop: 12 }}>
                <button onClick={closeReferenceModal} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer' }}>關閉</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

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
  settingsInfo: {
    fontSize: "12px",
    color: "#666",
    padding: "8px",
    background: "#f8fafc",
    borderRadius: "6px",
    marginBottom: "12px"
  },
  settingsForm: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  select: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    backgroundColor: "#fff"
  },
  subtitle: {
    fontSize: "16px",
    fontWeight: 500,
    marginBottom: "16px",
    color: "#1f2937"
  },
  agentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "16px",
    maxHeight: "400px",
    overflowY: "auto",
    padding: "4px"
  },
  agentCard: {
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    backgroundColor: "#fff",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  selectedAgentCard: {
    borderColor: "#4f46e5",
    backgroundColor: "#f5f3ff",
    boxShadow: "0 2px 4px rgba(79, 70, 229, 0.1)"
  },
  agentName: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#111827",
    marginBottom: "8px"
  },
  agentDescription: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "8px",
    lineHeight: 1.4
  },
  agentDate: {
    fontSize: "11px",
    color: "#9ca3af"
  },
  secondaryButton: {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    color: "#4f46e5",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s ease"
  }
}

export default SimpleChat 