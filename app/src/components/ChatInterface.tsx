import React, { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from 'react-router-dom'
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

interface Settings {
  apiUrl: string
  agentId: string
  apiKey: string
}



const ChatInterface: React.FC = () => {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState<string>("")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState<string>("")
  const [streamingReferences, setStreamingReferences] = useState<Reference[]>([])
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const [isComposing, setIsComposing] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [isSendHovered, setIsSendHovered] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [settingsChecked, setSettingsChecked] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const sessionCreatedRef = useRef(false)
  const initialMessageSentRef = useRef(false)

  const md = new MarkdownIt({ breaks: true })

  // Validate settings completeness
  const isValidSettings = (settings: any): settings is Settings => {
    return settings && 
           typeof settings.apiUrl === 'string' && settings.apiUrl.trim() !== '' &&
           typeof settings.agentId === 'string' && settings.agentId.trim() !== '' &&
           typeof settings.apiKey === 'string' && settings.apiKey.trim() !== ''
  }

  const createSession = useCallback(async () => {
    if (!settings || sessionCreatedRef.current) return

    sessionCreatedRef.current = true
    setIsLoading(true)
    
    try {
      console.log('Creating session...')
      const response = await fetch(`${settings.apiUrl}/api/v1/agents/${settings.agentId}/sessions`.replace(/([^:]\/)\/+/g, "$1"), {
        method: "POST",
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({})
      })
      
      const data = await response.json()
      console.log('Session response:', data)
      
      if (data.code === 0) {
        setSessionId(data.data.id)
        console.log('Session created:', data.data.id)
      } else {
        alert("Failed to create session. Please check your settings.")
        navigate('/settings')
      }
    } catch (error) {
      console.error("Error creating session:", error)
      alert("Failed to create session. Please check your settings.")
      navigate('/settings')
    } finally {
      setIsLoading(false)
    }
  }, [settings, navigate])

  const formatMessageWithReferences = (content: string, references: Reference[]) => {
    let html = md.render(content || '')
    html = html.replace(/##(\d+)\$\$/g, (match: string, index: string) => {
      const refIndex = parseInt(index, 10)
      if (Array.isArray(references) && refIndex >= 0 && refIndex < references.length && references[refIndex]) {
        const ref = references[refIndex]
        return `<span class="citation-ref" data-ref-index="${refIndex}" data-dataset-id="${ref.dataset_id || ''}" data-document-id="${ref.document_id || ''}" data-chunk-id="${ref.id || ''}" style="color: #4f46e5; cursor: pointer; user-select: none;">[${index}]</span>`
      }
      return `<span style="color: #f87171;">[?]</span>`
    })
    return html
  }

  const formatMessageContent = (content: string, references: Reference[] = []) => {
    // Check if content contains HTML code blocks (markdown style)
    const htmlBlockMatch = content.match(/```html\n([\s\S]*?)\n```/)
    
    if (htmlBlockMatch) {
      const htmlContent = htmlBlockMatch[1]
      const textBeforeHtml = content.substring(0, content.indexOf('```html')).trim()
      const textAfterHtml = content.substring(content.indexOf('```', content.indexOf('```html') + 6) + 3).trim()
      
      console.log('HTML content detected:', htmlContent.substring(0, 100))
      console.log('Text before HTML:', textBeforeHtml.substring(0, 100))
      console.log('Text after HTML:', textAfterHtml.substring(0, 100))
      
      return (
        <div>
          {textBeforeHtml && (
            <div dangerouslySetInnerHTML={{ 
              __html: formatMessageWithReferences(textBeforeHtml, references) 
            }} />
          )}
          <div style={styles.iframeContainer}>
            <iframe
              srcDoc={htmlContent}
              style={styles.iframe}
              sandbox="allow-scripts"
              title="Embedded content"
            />
          </div>
          {textAfterHtml && (
            <div dangerouslySetInnerHTML={{ 
              __html: formatMessageWithReferences(textAfterHtml, references) 
            }} />
          )}
        </div>
      )
    }
    
    // Check if content contains raw HTML documents
    if (content && (content.includes('<!DOCTYPE html>') || content.includes('<html'))) {
      // Extract text before HTML if any
      const htmlStart = content.indexOf('<!DOCTYPE html>') !== -1 ? content.indexOf('<!DOCTYPE html>') : content.indexOf('<html')
      const textBeforeHtml = content.substring(0, htmlStart).trim()
      
      // Find the end of HTML content
      const htmlEndTag = content.indexOf('</html>')
      let htmlContent = content.substring(htmlStart)
      let textAfterHtml = ''
      
      if (htmlEndTag !== -1) {
        const htmlEnd = htmlEndTag + 7 // length of '</html>'
        htmlContent = content.substring(htmlStart, htmlEnd)
        textAfterHtml = content.substring(htmlEnd).trim()
      }
      
      return (
        <div>
          {textBeforeHtml && (
            <div dangerouslySetInnerHTML={{ 
              __html: formatMessageWithReferences(textBeforeHtml, references) 
            }} />
          )}
          <div style={styles.iframeContainer}>
            <iframe
              srcDoc={htmlContent}
              style={styles.iframe}
              sandbox="allow-scripts"
              title="Embedded content"
            />
          </div>
          {textAfterHtml && (
            <div dangerouslySetInnerHTML={{ 
              __html: formatMessageWithReferences(textAfterHtml, references) 
            }} />
          )}
        </div>
      )
    }
    
    // Regular markdown content
    return (
      <div dangerouslySetInnerHTML={{ 
        __html: formatMessageWithReferences(content, references) 
      }} />
    )
  }

  const sendMessage = useCallback(async (message: string, isInitial: boolean = false) => {
    if (!message || !sessionId || !settings || isSending) return
    
    console.log('Sending message:', message, 'isInitial:', isInitial)
    setIsSending(true)
    
    if (!isInitial) {
      const userMessage: Message = { role: "user", content: message }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    }
    
    setStreamingContent("")
    setStreamingReferences([])
    
    try {
      const requestBody = {
        question: message,
        stream: true,
        session_id: sessionId,
      }
      console.log('Request body:', requestBody)

      const response = await fetch(`${settings.apiUrl}/api/v1/agents/${settings.agentId}/completions`.replace(/([^:]\/)\/+/g, "$1"), {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify(requestBody)
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.body) throw new Error("No response body")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let accumulatedContent = ""
      let accumulatedReferences: Reference[] = []

      console.log('Starting to read stream...')

        while (true) {
          const { done, value } = await reader.read()
        if (done) {
          console.log('Stream ended')
          break
        }

        buffer += decoder.decode(value, { stream: true })
        console.log('Raw buffer:', buffer)
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""
          
          for (const line of lines) {
          console.log('Processing line:', line)
          if (line.startsWith("data:")) {
            const data = line.slice(5).trim()
            console.log('Extracted data:', data)
            if (data === "[DONE]") {
              console.log('Stream done signal received')
              continue
            }
            if (!data) continue

            try {
              const parsed = JSON.parse(data)
              console.log('Parsed stream data:', parsed)
              
              // Handle different response formats
              if (parsed.data) {
                if (parsed.data.answer !== undefined) {
                  // Only update if we have content, don't overwrite with empty strings
                  if (parsed.data.answer.trim() || !accumulatedContent) {
                    accumulatedContent = parsed.data.answer
                    console.log('Updated content:', accumulatedContent)
                    setStreamingContent(accumulatedContent)
                  } else {
                    console.log('Skipping empty answer, keeping existing content:', accumulatedContent)
                  }
                }
                if (parsed.data.reference && typeof parsed.data.reference === 'object') {
                  // Handle reference object structure
                  if (parsed.data.reference.chunks && Array.isArray(parsed.data.reference.chunks)) {
                    accumulatedReferences = parsed.data.reference.chunks.map((chunk: any) => ({
                      content: chunk.content,
                      document_name: chunk.document_name,
                      positions: chunk.positions || [],
                      dataset_id: chunk.dataset_id,
                      document_id: chunk.document_id,
                      id: chunk.id
                    }))
                    console.log('Updated references:', accumulatedReferences)
                    setStreamingReferences(accumulatedReferences)
                  } else if (Array.isArray(parsed.data.reference)) {
                    accumulatedReferences = [...accumulatedReferences, ...parsed.data.reference]
                    setStreamingReferences(accumulatedReferences)
                  }
                }
              }
              // Sometimes the answer might be directly in the parsed object
              else if (parsed.answer !== undefined) {
                if (parsed.answer.trim() || !accumulatedContent) {
                  accumulatedContent = parsed.answer
                  console.log('Updated content (direct):', accumulatedContent)
                  setStreamingContent(accumulatedContent)
                } else {
                  console.log('Skipping empty direct answer, keeping existing content:', accumulatedContent)
                }
              }
            } catch (e) {
              console.error("Error parsing stream data:", e, "Raw data:", data)
            }
          } else if (line.trim()) {
            // Try to parse lines that don't start with "data:"
            try {
              const parsed = JSON.parse(line.trim())
              console.log('Parsed non-data line:', parsed)
              if (parsed.data && parsed.data.answer !== undefined) {
                accumulatedContent = parsed.data.answer
                console.log('Updated content (non-data):', accumulatedContent)
                setStreamingContent(accumulatedContent)
              }
            } catch (e) {
              console.log('Non-JSON line:', line.trim())
            }
          }
        }
      }

      // Add final message only if we have content
      console.log('Final accumulated content:', accumulatedContent)
      console.log('Final accumulated references:', accumulatedReferences)
      
      if (accumulatedContent.trim()) {
        console.log('Adding final message:', accumulatedContent)
        const finalMessage = {
          role: "assistant" as const,
          content: accumulatedContent,
          references: accumulatedReferences
        }
        console.log('Final message object:', finalMessage)
        
        // Add the final message and clear streaming content immediately
        setMessages(prev => {
          const newMessages = [...prev, finalMessage]
          console.log('Final messages array will be:', newMessages)
          console.log('Previous messages:', prev)
          console.log('Adding message:', finalMessage)
          return newMessages
        })
        
        setStreamingContent("")
        setStreamingReferences([])
      } else {
        console.log('No content to add as final message')
        setStreamingContent("")
        setStreamingReferences([])
      }

    } catch (error) {
      console.error("Error sending message:", error)
      alert("Failed to send message. Please check your connection.")
    } finally {
      setIsSending(false)
    }
  }, [sessionId, settings, isSending])

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('chatSettings')
    
    if (!savedSettings) {
      navigate('/settings')
      return
    }

    try {
      const parsedSettings = JSON.parse(savedSettings)
      
      if (!isValidSettings(parsedSettings)) {
        localStorage.removeItem('chatSettings')
        alert('Invalid settings detected. Please configure your settings again.')
        navigate('/settings')
        return
      }

      setSettings(parsedSettings)
    } catch (error) {
      localStorage.removeItem('chatSettings')
      alert('Corrupted settings detected. Please configure your settings again.')
      navigate('/settings')
      return
    } finally {
      setSettingsChecked(true)
    }
  }, [navigate])

  // Create session when settings are loaded
  useEffect(() => {
    if (settings && !sessionId && !sessionCreatedRef.current) {
      createSession()
    }
  }, [settings, sessionId, createSession])

  // Send initial message when session is created (only once)
  useEffect(() => {
    if (sessionId && !initialMessageSentRef.current) {
      console.log('Session ready, sending initial message')
      initialMessageSentRef.current = true
      sendMessage("hi", true)
    }
  }, [sessionId, sendMessage])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  // Add click handler for citation references
  useEffect(() => {
    const handleCitationClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.classList.contains('citation-ref')) {
        const refIndex = parseInt(target.getAttribute('data-ref-index') || '-1')
        const dataset_id = target.getAttribute('data-dataset-id') || undefined
        const document_id = target.getAttribute('data-document-id') || undefined
        const id = target.getAttribute('data-chunk-id') || undefined
        
        // Find the references from current streaming or messages
        let references: Reference[] = []
        if (streamingContent && streamingReferences.length > 0) {
          references = streamingReferences
        } else {
          // Find references from the message containing this citation
          for (const msg of messages) {
            if (msg.references && msg.references.length > refIndex) {
              references = msg.references
              break
            }
          }
        }
        
        if (references && references[refIndex]) {
          const ref = { ...references[refIndex], dataset_id, document_id, id }
          // Show reference details (you can customize this)
          alert(`引用資料：\n\n文件：${ref.document_name}\n\n內容：${ref.content}`)
        }
      }
    }

    document.addEventListener('click', handleCitationClick)
    return () => {
      document.removeEventListener('click', handleCitationClick)
    }
  }, [messages, streamingContent, streamingReferences])

  const handleSendMessage = () => {
    const message = input.trim()
    if (!isComposing && message && !isSending) {
      sendMessage(message)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Don't render anything until settings are checked
  if (!settingsChecked) {
    return null
  }

  // If we reach here and settings is null, it means redirect is in progress
  if (!settings) {
    return null
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>AI Chat</h1>
        <div style={styles.headerActions}>
          <div style={styles.agentInfo}>
            Agent: {settings.agentId}
        </div>
                    <button
            onClick={() => navigate('/settings')}
            style={styles.settingsButton}
          >
            Settings
                    </button>
                          </div>
                      </div>

      <div style={styles.chatContainer}>
        <div style={styles.messagesContainer}>
          {messages.map((message, index) => {
            console.log(`Rendering message ${index}:`, message)
            return (
              <div key={index} style={styles.messageWrapper}>
                <div style={{
                  ...styles.message,
                  ...(message.role === 'user' ? styles.userMessage : styles.assistantMessage)
                }}>
                                      <div style={styles.messageContent}>
                      {message.role === 'assistant' ? (
                        formatMessageContent(message.content, message.references || [])
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: md.render(message.content) }} />
                      )}
                    </div>
                </div>
              </div>
            )
          })}

          {streamingContent && (
            <div style={styles.messageWrapper}>
              <div style={{...styles.message, ...styles.assistantMessage}}>
                <div style={styles.messageContent}>
                  {formatMessageContent(streamingContent, streamingReferences)}
                  <span style={styles.cursor}>▊</span>
                </div>
              </div>
            </div>
          )}

          {(isLoading || isSending) && (
            <div style={styles.messageWrapper}>
              <div style={{...styles.message, ...styles.assistantMessage}}>
                <div style={styles.messageContent}>
                  <div style={styles.loadingDots}>
                    <span>.</span><span>.</span><span>.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div style={styles.inputContainer}>
          <div style={styles.inputWrapper}>
            <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="Type your message..."
              style={{
                ...styles.input,
                ...(isInputFocused ? styles.inputFocused : {})
              }}
              rows={1}
              disabled={isSending}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isSending}
              onMouseEnter={() => setIsSendHovered(true)}
              onMouseLeave={() => setIsSendHovered(false)}
              style={{
                ...styles.sendButton,
                ...(input.trim() && !isSending ? styles.sendButtonActive : styles.sendButtonDisabled),
                ...(isSendHovered && input.trim() && !isSending ? styles.sendButtonHovered : {})
              }}
            >
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(rgb(26, 31, 44), rgb(45, 55, 72))'
  },
  header: {
    padding: '20px',
    background: 'rgb(26, 31, 44)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    margin: 0,
    fontSize: '24px',
    color: '#fff',
    fontWeight: 600
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  agentInfo: {
    color: '#a0aec0',
    fontSize: '14px'
  },
  settingsButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#fff',
    border: '1px solid #fff',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  chatContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  messagesContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  messageWrapper: {
    display: 'flex',
    width: '100%'
  },
  message: {
    maxWidth: '70%',
    padding: '12px 16px',
    borderRadius: '12px',
    wordWrap: 'break-word'
  },
  userMessage: {
    backgroundColor: '#4f46e5',
    color: '#fff',
    marginLeft: 'auto',
    borderBottomRightRadius: '4px'
  },
  assistantMessage: {
    backgroundColor: '#fff',
    color: '#1a202c',
    borderBottomLeftRadius: '4px'
  },
  messageContent: {
    lineHeight: '1.5'
  },
  cursor: {
    animation: 'blink 1s infinite',
    color: '#4f46e5'
  },
  loadingDots: {
    display: 'flex',
    gap: '2px'
  },
  inputContainer: {
    padding: '20px',
    borderTop: '1px solid #4a5568'
  },
  inputWrapper: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-end'
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid #4a5568',
    borderRadius: '8px',
    backgroundColor: '#2d3748',
    color: '#fff',
    fontSize: '14px',
    resize: 'none',
    outline: 'none',
    maxHeight: '120px'
  },
  inputFocused: {
    borderColor: '#4f46e5'
  },
  sendButton: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  },
  sendButtonActive: {
    backgroundColor: '#4f46e5',
    color: '#fff'
  },
  sendButtonDisabled: {
    backgroundColor: '#4a5568',
    color: '#a0aec0',
    cursor: 'not-allowed'
  },
  sendButtonHovered: {
    backgroundColor: '#4338ca'
  },
  iframeContainer: {
    width: "100%",
    marginTop: "16px",
    marginBottom: "16px",
    borderRadius: "8px",
    overflow: "hidden",
    backgroundColor: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
  },
  iframe: {
    width: "100%",
    height: "500px",
    border: "none",
    borderRadius: "8px"
  }
}

export default ChatInterface
