import React, { useState, useRef, useEffect } from 'react'
import { useChat, Message, Reference } from '../hooks/useChat'
import MarkdownIt from 'markdown-it'

const ChatPanel: React.FC = () => {
  const [inputValue, setInputValue] = useState('')
  const [datasets, setDatasets] = useState<any[]>([])
  const [totalSources, setTotalSources] = useState(0)
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  
  // 使用 useChat Hook 获取聊天功能
  const {
    messages,
    streamingContent,
    streamingReferences,
    isSending,
    sendMessage
  } = useChat()

  const md = new MarkdownIt({ breaks: true })

  // 格式化消息内容，包含引用处理
  const formatMessageWithReferences = (content: string, references: Reference[] = []) => {
    let html = md.render(content || '')
    html = html.replace(/##(\d+)\$\$/g, (match: string, index: string) => {
      const refIndex = parseInt(index, 10)
      if (Array.isArray(references) && refIndex >= 0 && refIndex < references.length && references[refIndex]) {
        const ref = references[refIndex]
        return `<span class="citation-ref" data-ref-index="${refIndex}" style="color: #4f46e5; cursor: pointer; user-select: none; background: rgba(79, 70, 229, 0.1); padding: 2px 4px; border-radius: 4px; font-size: 12px;">[${index}]</span>`
      }
      return `<span style="color: #f87171;">[?]</span>`
    })
    return html
  }

  // 自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  React.useEffect(() => {
    // 从 localStorage 获取设置并加载数据集
    const savedSettings = localStorage.getItem('chatSettings')
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        fetchDatasets(settings)
      } catch (error) {
        console.error('Failed to parse settings')
      }
    }
  }, [])

  const fetchDatasets = async (settings: any) => {
    try {
      const response = await fetch(`${settings.apiUrl}/api/v1/datasets`, {
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`
        }
      })
      
      const data = await response.json()
      if (data.code === 0 && Array.isArray(data.data)) {
        setDatasets(data.data)
        const total = data.data.reduce((sum: number, dataset: any) => sum + dataset.document_count, 0)
        setTotalSources(total)
      }
    } catch (error) {
      console.error('Failed to fetch datasets:', error)
    }
  }

  const presetActions = [
    {
      id: 'note',
      icon: '📝',
      title: '新增記事',
      description: '创建一个新的记事本',
      color: '#f59e0b'
    },
    {
      id: 'audio',
      icon: '🎧',
      title: '語音導覽',
      description: '生成语音摘要',
      color: '#3b82f6'
    }
  ]

  const suggestedQuestions = [
    "这份GitHub资料库的主要内容包含什么？",
    "该专案如何展现巴菲特的其他想法？",
    "这些..."
  ]

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isSending) return
    
    setInputValue('')
    // 使用 useChat 的 sendMessage 函数
    await sendMessage(message)
  }

  const handleInputSubmit = () => {
    handleSendMessage(inputValue)
  }

  const handleSuggestionClick = (question: string) => {
    handleSendMessage(question)
  }

  return (
    <div style={styles.panel}>
      {/* 头部 */}
      <div style={styles.header}>
        <h1 style={styles.title}>對話</h1>
      </div>

      {/* 主要内容区域 */}
      <div style={styles.content}>
        {/* 文档信息卡片 */}
        <div style={styles.documentCard}>
          <div style={styles.documentIcon}>📄</div>
          <div style={styles.documentInfo}>
            <h2 style={styles.documentTitle}>
              知識庫🤖
            </h2>
            <p style={styles.documentMeta}>回應來自於LLM和RAG</p>
            <p style={styles.documentDescription}>
            🤖
            </p>
          </div>
        </div>

                {/* 操作按钮 */}
        {messages.length === 0 && false && (
          <div style={styles.actionsSection}>
            <div style={styles.actionsGrid}>
              {presetActions.map((action) => (
                <button
                  key={action.id}
                  style={{
                    ...styles.actionButton,
                    borderLeft: `4px solid ${action.color}`
                  }}
                  onClick={() => {
                    if (action.id === 'note') {
                      handleSendMessage('请帮我创建一个新的记事本')
                    }
                  }}
                >
                  <span style={styles.actionIcon}>{action.icon}</span>
                  <span style={styles.actionTitle}>{action.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 聊天消息区域 */}
        {messages.length > 0 && (
          <div style={styles.messagesContainer}>
            {messages.map((message, index) => (
              <div key={index} style={styles.messageWrapper}>
                <div style={{
                  ...styles.message,
                  ...(message.role === 'user' ? styles.userMessage : styles.assistantMessage)
                }}>
                  {message.role === 'assistant' ? (
                    <div dangerouslySetInnerHTML={{ 
                      __html: formatMessageWithReferences(message.content, message.references || []) 
                    }} />
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
            {isSending && (
              <div style={styles.messageWrapper}>
                <div style={styles.loadingMessage}>
                  <div style={styles.loadingDots} className="loading-dots">
                    <span>.</span><span>.</span><span>.</span>
                  </div>
                </div>
              </div>
            )}
            {streamingContent && (
              <div style={styles.messageWrapper}>
                <div style={styles.assistantMessage}>
                  <div dangerouslySetInnerHTML={{ 
                    __html: formatMessageWithReferences(streamingContent, streamingReferences) 
                  }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* 聊天输入区域 */}
        <div style={styles.chatInputSection}>
          <div style={styles.inputWrapper}>
            <div style={styles.inputContainer}>
              <input
                type="text"
                placeholder="開始輸入..."
                style={styles.chatInput}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleInputSubmit()}
              />
              <div style={styles.inputMeta}>
                <button style={styles.sendButton} onClick={handleInputSubmit}>
                  <span style={styles.sendIcon}>➤</span>
                </button>
              </div>
            </div>
            
            {/* 建议问题 - 只在没有消息时显示 */}
            {messages.length === 0 && (
              <div style={styles.suggestions}>
                {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      style={styles.suggestionButton}
                      onClick={() => handleSuggestionClick(question)}
                    >
                    {question}
                    <span style={styles.suggestionArrow}>→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 底部说明 */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            LLM使用RAG技術，搭配可信資源來產生回應，但請務必查證。
          </p>
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  panel: {
    background: '#ffffff',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  header: {
    padding: '16px 24px',
    borderBottom: '1px solid #e8eaed',
  },

  title: {
    fontSize: '24px',
    fontWeight: 400,
    margin: 0,
    color: '#202124',
  },

  content: {
    flex: 1,
    padding: '24px',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%',
  },

  documentCard: {
    display: 'flex',
    gap: '16px',
    padding: '24px',
    background: '#f8f9fa',
    borderRadius: '12px',
    marginBottom: '32px',
  },

  documentIcon: {
    fontSize: '32px',
    flexShrink: 0,
  },

  documentInfo: {
    flex: 1,
  },

  documentTitle: {
    fontSize: '20px',
    fontWeight: 500,
    margin: '0 0 8px 0',
    color: '#202124',
  },

  documentMeta: {
    fontSize: '14px',
    color: '#5f6368',
    margin: '0 0 12px 0',
  },

  documentDescription: {
    fontSize: '14px',
    lineHeight: 1.5,
    color: '#5f6368',
    margin: 0,
  },

  actionsSection: {
    marginBottom: '32px',
  },

  actionsGrid: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },

  actionButton: {
    background: '#ffffff',
    border: '1px solid #dadce0',
    borderRadius: '24px',
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    color: '#202124',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },

  actionIcon: {
    fontSize: '16px',
  },

  actionTitle: {
    fontSize: '14px',
  },

  chatInputSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },

  inputWrapper: {
    width: '100%',
  },

  inputContainer: {
    background: '#f8f9fa',
    borderRadius: '24px',
    padding: '16px 20px',
    marginBottom: '16px',
    border: '1px solid #e8eaed',
  },

  chatInput: {
    width: '100%',
    border: 'none',
    background: 'transparent',
    fontSize: '16px',
    outline: 'none',
    color: '#202124',
    marginBottom: '12px',
  },

  inputMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sourceCount: {
    fontSize: '12px',
    color: '#5f6368',
  },

  sendButton: {
    background: '#1a73e8',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#ffffff',
  },

  sendIcon: {
    fontSize: '14px',
  },

  suggestions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  suggestionButton: {
    background: 'transparent',
    border: '1px solid #e8eaed',
    borderRadius: '20px',
    padding: '12px 16px',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#5f6368',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.2s ease',
  },

  suggestionArrow: {
    color: '#1a73e8',
    fontSize: '12px',
  },

  footer: {
    marginTop: '24px',
    textAlign: 'center',
  },

  footerText: {
    fontSize: '12px',
    color: '#5f6368',
    margin: 0,
  },

  // 聊天消息样式
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 0 20px 0',
    maxHeight: '400px',
  },

  messageWrapper: {
    marginBottom: '16px',
  },

  message: {
    padding: '12px 16px',
    borderRadius: '16px',
    fontSize: '14px',
    lineHeight: 1.5,
    maxWidth: '80%',
    wordWrap: 'break-word',
  },

  userMessage: {
    background: '#e3f2fd',
    color: '#1565c0',
    marginLeft: 'auto',
    textAlign: 'right',
  },

  assistantMessage: {
    background: '#f5f5f5',
    color: '#202124',
    marginRight: 'auto',
  },

  loadingMessage: {
    background: '#f5f5f5',
    color: '#5f6368',
    padding: '12px 16px',
    borderRadius: '16px',
    maxWidth: '80%',
    marginRight: 'auto',
  },

  loadingDots: {
    display: 'inline-flex',
    gap: '2px',
  },

  // 聊天模式样式
  chatContainer: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#ffffff',
  },

  chatHeader: {
    padding: '16px 24px',
    borderBottom: '1px solid #e8eaed',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  chatTitle: {
    fontSize: '20px',
    fontWeight: 500,
    margin: 0,
    color: '#202124',
  },

  backButton: {
    background: 'transparent',
    border: 'none',
    color: '#1a73e8',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '8px 12px',
    borderRadius: '4px',
  },

  chatInterfaceWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
}

export default ChatPanel 