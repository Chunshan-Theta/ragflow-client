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



// Reference modal component
const ReferenceModal: React.FC<{
  reference: Reference | null
  onClose: () => void
  position?: { x: number, y: number }
  hostUrl?: string
}> = ({ reference, onClose, position, hostUrl }) => {
  const [isDownloading, setIsDownloading] = useState(false)
  
  if (!reference) return null

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  }

  const contentStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    minWidth: '320px',
    width: '90vw',
    maxHeight: '80vh',
    overflow: 'auto',
    margin: '20px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
    position: 'relative',
  }

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#1a202c', fontSize: '18px', fontWeight: 600 }}>引用資料來源</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#64748b',
              padding: '0',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{ 
            fontWeight: 600, 
            color: '#4f46e5', 
            marginBottom: '8px',
            fontSize: '14px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            文件名稱
          </div>
          <div style={{ 
            color: '#1a202c', 
            fontSize: '16px',
            padding: '8px 12px',
            backgroundColor: '#f8fafc',
            borderRadius: '6px',
            border: '1px solid #e2e8f0'
          }}>
            {reference.document_name}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            fontWeight: 600, 
            color: '#4f46e5', 
            marginBottom: '8px',
            fontSize: '14px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            引用內容
          </div>
          <div style={{ 
            color: '#374151', 
            lineHeight: 1.6,
            fontSize: '14px',
            padding: '16px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            maxHeight: '300px',
            overflow: 'auto'
          }}>
            {reference.content}
          </div>
      </div>

        {reference.document_id && reference.dataset_id && (
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#fff',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              關閉
            </button>
            <button
              onClick={() => {
                alert('開始下載文件...')
                onClose()
                
                const apiKey = JSON.parse(localStorage.getItem('chatSettings') || '{}').apiKey
                const link = document.createElement('a')
                link.href = `${hostUrl}/api/v1/datasets/${reference.dataset_id}/documents/${reference.document_id}`
                link.download = reference.document_name || 'document'
                
                // Try to add auth header through fetch and create blob URL
                fetch(link.href, {
                  headers: { 'Authorization': `Bearer ${apiKey}` }
                })
                .then(res => res.blob())
                .then(blob => {
                  const url = URL.createObjectURL(blob)
                  link.href = url
                  link.click()
                  URL.revokeObjectURL(url)
                })
                .catch(() => {
                  // Fallback to direct link (might fail due to auth)
                  link.click()
                })
              }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#4f46e5',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              下載文件
            </button>
      </div>
        )}
      </div>
    </div>
  )
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
  const [selectedReference, setSelectedReference] = useState<Reference | null>(null)
  const [hoveredRefIndex, setHoveredRefIndex] = useState<string | null>(null)
  const [expandedReferences, setExpandedReferences] = useState<Set<string>>(new Set())

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
      
      if (data.code === 0) {
        setSessionId(data.data.id)
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

  const wrapHtmlWithErrorHandling = (htmlContent: string): string => {
    // 在iframe中注入错误处理和兜底方案
    const errorHandlingScript = `
    <script>
      window.onerror = function(msg, url, line, col, error) {
        console.log('Script error caught:', msg);
        // 如果有D3错误，显示错误消息
        document.body.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;"><h3>图表渲染出现问题</h3><p>原始内容:</p><pre style="text-align: left; background: #f5f5f5; padding: 10px; overflow: auto;">' + 
          document.body.innerHTML.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre></div>';
        return true;
      };
      
      // 等待页面加载完成后检查是否有内容渲染
      window.addEventListener('load', function() {
        setTimeout(function() {
          const svg = document.querySelector('svg');
          const chart = document.querySelector('#chart');
          
          // 如果5秒后还没有渲染出图表，显示原始内容
          if (svg && svg.children.length === 0) {
            document.body.innerHTML = '<div style="padding: 20px;"><h3>图表未能正确渲染</h3><p>检测到的内容但未能显示图表</p></div>';
          } else if (chart && chart.children.length === 0) {
            document.body.innerHTML = '<div style="padding: 20px;"><h3>图表容器为空</h3><p>图表容器存在但没有内容</p></div>';
          }
        }, 5000);
      });
    </script>
    `;
    
    // 如果已经包含完整的HTML文档，在head中插入错误处理
    if (htmlContent.includes('<!DOCTYPE html>') || htmlContent.includes('<html')) {
      return htmlContent.replace('</head>', errorHandlingScript + '\n</head>');
    } else {
      // 如果只是HTML片段，包装成完整文档
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Chart Content</title>
          ${errorHandlingScript}
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `;
    }
  }

  const formatMessageContent = (content: string, references: Reference[] = []) => {
    // Check if content contains HTML code blocks (markdown style)
    const htmlBlockMatch = content.match(/```html\n([\s\S]*?)\n```/)
    
    if (htmlBlockMatch) {
      let htmlContent = htmlBlockMatch[1]
      const textBeforeHtml = content.substring(0, content.indexOf('```html')).trim()
      const textAfterHtml = content.substring(content.indexOf('```', content.indexOf('```html') + 6) + 3).trim()
      
      // Wrap HTML content with error handling
      htmlContent = wrapHtmlWithErrorHandling(htmlContent)
      
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

      if (!response.body) throw new Error("No response body")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let accumulatedContent = ""
      let accumulatedReferences: Reference[] = []

        while (true) {
          const { done, value } = await reader.read()
        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""
          
          for (const line of lines) {
          if (line.startsWith("data:")) {
            const data = line.slice(5).trim()
            if (data === "[DONE]") {
              continue
            }
            if (!data) continue

            try {
              const parsed = JSON.parse(data)
              
              // Handle different response formats
              if (parsed.data) {
                if (parsed.data.answer !== undefined) {
                  // Only update if we have content, don't overwrite with empty strings
                  if (parsed.data.answer.trim() || !accumulatedContent) {
                    accumulatedContent = parsed.data.answer
                    setStreamingContent(accumulatedContent)
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
                  setStreamingContent(accumulatedContent)
                }
              }
            } catch (e) {
              console.error("Error parsing stream data:", e, "Raw data:", data)
            }
          } else if (line.trim()) {
            // Try to parse lines that don't start with "data:"
            try {
              const parsed = JSON.parse(line.trim())
              if (parsed.data && parsed.data.answer !== undefined) {
                accumulatedContent = parsed.data.answer
                setStreamingContent(accumulatedContent)
              }
            } catch (e) {
              // Ignore non-JSON lines
            }
          }
        }
      }

      // Add final message only if we have content
      if (accumulatedContent.trim()) {
        const finalMessage = {
          role: "assistant" as const,
          content: accumulatedContent,
          references: accumulatedReferences
        }
        
        // Add the final message and clear streaming content immediately
        setMessages(prev => [...prev, finalMessage])
        
        setStreamingContent("")
        setStreamingReferences([])
      } else {
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
          setSelectedReference(ref)
        }
      }
    }

    document.addEventListener('click', handleCitationClick)
    return () => {
      document.removeEventListener('click', handleCitationClick)
    }
  }, [messages, streamingContent, streamingReferences])

  const closeReferenceModal = () => {
    setSelectedReference(null)
  }

  const toggleReferenceExpansion = (refKey: string) => {
    setExpandedReferences(prev => {
      const newSet = new Set(prev)
      if (newSet.has(refKey)) {
        newSet.delete(refKey)
      } else {
        newSet.add(refKey)
      }
      return newSet
    })
  }

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
          {messages.map((message, index) => (
            <React.Fragment key={index}>
              <div style={styles.messageWrapper}>
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
              
              {/* 參考資料區塊 */}
              {message.role === 'assistant' && message.references && message.references.length > 0 && (() => {
                const refGroupKey = `msg-${index}`
                const isExpanded = expandedReferences.has(refGroupKey)
                return (
                  <div style={styles.messageWrapper}>
                    <div style={styles.referencesMessage}>
                      <div 
                        style={{...styles.referencesHeader, cursor: 'pointer'}}
                        onClick={() => toggleReferenceExpansion(refGroupKey)}
                      >
                        <span style={styles.expandIcon}>
                          {isExpanded ? '▼' : '▶'}
                        </span>
                        📚 參考資料 ({message.references.length})
                      </div>
                      {isExpanded && (
                        <div style={styles.referencesContainer}>
                          {message.references.map((reference, refIndex) => {
                            const refKey = `${index}-${refIndex}`
                            const isHovered = hoveredRefIndex === refKey
                            return (
                              <div
                                key={refIndex}
                                style={{
                                  ...styles.referenceItem,
                                  backgroundColor: isHovered ? '#f1f5f9' : '#fff',
                                  borderColor: isHovered ? '#4f46e5' : '#e2e8f0'
                                }}
                                onClick={() => setSelectedReference(reference)}
                                onMouseEnter={() => setHoveredRefIndex(refKey)}
                                onMouseLeave={() => setHoveredRefIndex(null)}
                              >
                                <div style={styles.referenceIcon}>📄</div>
                                <div style={styles.referenceInfo}>
                                  <div style={styles.referenceTitle}>
                                    {reference.document_name}
                                  </div>
                                  <div style={styles.referencePreview}>
                                    {reference.content.substring(0, 100)}
                                    {reference.content.length > 100 && '...'}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </React.Fragment>
          ))}

          {/* 串流中的訊息 */}
          {streamingContent && (
            <React.Fragment>
              <div style={styles.messageWrapper}>
                <div style={{...styles.message, ...styles.assistantMessage}}>
                  <div style={styles.messageContent}>
                    {formatMessageContent(streamingContent, streamingReferences)}
                    <span style={styles.cursor}>▊</span>
                  </div>
                </div>
              </div>
              
                             {/* 串流中的參考資料 */}
               {streamingReferences && streamingReferences.length > 0 && (() => {
                 const refGroupKey = 'streaming'
                 const isExpanded = expandedReferences.has(refGroupKey)
                 return (
                   <div style={styles.messageWrapper}>
                     <div style={styles.referencesMessage}>
                       <div 
                         style={{...styles.referencesHeader, cursor: 'pointer'}}
                         onClick={() => toggleReferenceExpansion(refGroupKey)}
                       >
                         <span style={styles.expandIcon}>
                           {isExpanded ? '▼' : '▶'}
                         </span>
                         📚 參考資料 ({streamingReferences.length})
                       </div>
                       {isExpanded && (
                         <div style={styles.referencesContainer}>
                           {streamingReferences.map((reference, refIndex) => {
                             const refKey = `streaming-${refIndex}`
                             const isHovered = hoveredRefIndex === refKey
                             return (
                               <div
                                 key={refIndex}
                                 style={{
                                   ...styles.referenceItem,
                                   backgroundColor: isHovered ? '#f1f5f9' : '#fff',
                                   borderColor: isHovered ? '#4f46e5' : '#e2e8f0'
                                 }}
                                 onClick={() => setSelectedReference(reference)}
                                 onMouseEnter={() => setHoveredRefIndex(refKey)}
                                 onMouseLeave={() => setHoveredRefIndex(null)}
                               >
                                 <div style={styles.referenceIcon}>📄</div>
                                 <div style={styles.referenceInfo}>
                                   <div style={styles.referenceTitle}>
                                     {reference.document_name}
                                   </div>
                                   <div style={styles.referencePreview}>
                                     {reference.content.substring(0, 100)}
                                     {reference.content.length > 100 && '...'}
                                   </div>
                                 </div>
                               </div>
                             )
                           })}
                         </div>
                       )}
                     </div>
                   </div>
                 )
               })()}
            </React.Fragment>
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

      {/* Reference Modal */}
      <ReferenceModal 
        reference={selectedReference}
        onClose={closeReferenceModal}
        hostUrl={settings?.apiUrl}
      />
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
    width: '100%',
  },
  message: {
    minWidth: '55vw',
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
    height: "70vh",
    border: "none",
    borderRadius: "8px"
  },
  referencesMessage: {
    minWidth: '55vw',
    padding: '12px 16px',
    borderRadius: '12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    color: '#374151',
    borderBottomLeftRadius: '4px',
    marginTop: '8px'
  },
  referencesHeader: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4f46e5',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    userSelect: 'none'
  },
  expandIcon: {
    fontSize: '12px',
    color: '#4f46e5',
    transition: 'transform 0.2s ease',
    marginRight: '4px'
  },
  referencesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  referenceItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  referenceIcon: {
    fontSize: '16px',
    flexShrink: 0,
    marginTop: '2px'
  },
  referenceInfo: {
    flex: 1,
    minWidth: 0
  },
  referenceTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: '4px',
    wordBreak: 'break-word'
  },
  referencePreview: {
    fontSize: '12px',
    color: '#64748b',
    lineHeight: '1.4',
    wordBreak: 'break-word'
  }
}

export default ChatInterface
