import React, { useState, useRef, useEffect } from 'react'
import { useChat, Message, Reference } from '../hooks/useChat'
import MarkdownIt from 'markdown-it'
import { validateHtml } from '../utils/htmlValidator';

// 引用模態框組件
export const ReferenceModal: React.FC<{
  reference: Reference | null
  onClose: () => void
  settings: any
}> = ({ reference, onClose, settings }) => {
  if (!reference) return null

  const stripHtmlTags = (html: string) => {
    return html.replace(/<[^>]*>/g, '')
  }

  const handleDownload = async () => {
    if (!reference.dataset_id || !reference.document_id) {
      console.error('Missing dataset_id or document_id')
      return
    }

    try {
      const response = await fetch(
        `${settings.apiUrl}/api/v1/datasets/${reference.dataset_id}/documents/${reference.document_id}`,
        {
          headers: {
            'Authorization': `Bearer ${settings.apiKey}`,
          }
        }
      )

      if (!response.ok) throw new Error('Download failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = reference.document_name || 'document'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download document:', error)
    }
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>引用資料來源</h3>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>
        
        <div style={styles.modalSection}>
          <div style={styles.sectionLabel}>文件名稱</div>
          <div style={styles.sectionContent}>{reference.document_name}</div>
        </div>

        <div style={styles.modalSection}>
          <div style={styles.sectionLabel}>引用內容</div>
          <div style={styles.referenceContent}>{stripHtmlTags(reference.content)}</div>
        </div>

        <div style={styles.modalFooter}>
          <button 
            onClick={()=>{
              handleDownload()
              alert('下載準備中，請稍後....')
              onClose()
            }}
            style={{...styles.modalButton}}
            disabled={!reference.dataset_id || !reference.document_id}
          >
            下載文件
          </button>
          <button onClick={onClose} style={{...styles.modalButton, backgroundColor: '#f87171', color: '#fff'}}>關閉</button>
        </div>
      </div>
    </div>
  )
}

// 文檔卡片組件
const DocumentCard: React.FC = () => (
  <div style={styles.documentCard}>
    <div style={styles.documentIcon}>📄</div>
    <div style={styles.documentInfo}>
      <h2 style={styles.documentTitle}>知識庫🤖</h2>
      <p style={styles.documentMeta}>回應來自於LLM和RAG</p>
      <p style={styles.documentDescription}>🤖</p>
    </div>
  </div>
)

// 建議問題組件
const SuggestedQuestions: React.FC<{
  questions: string[]
  onQuestionClick: (question: string) => void
}> = ({ questions, onQuestionClick }) => (
  <div style={styles.suggestions}>
    {questions.map((question, index) => (
      <button
        key={index}
        style={styles.suggestionButton}
        onClick={() => onQuestionClick(question)}
      >
        {question}
        <span style={styles.suggestionArrow}>→</span>
      </button>
    ))}
  </div>
)

// 聊天輸入組件
const ChatInput: React.FC<{
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled: boolean
}> = ({ value, onChange, onSubmit, disabled }) => (
  <div style={styles.inputContainer}>
    <input
      type="text"
      placeholder="開始輸入..."
      style={styles.chatInput}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyPress={(e) => e.key === 'Enter' && !disabled && onSubmit()}
      disabled={disabled}
    />
    <div style={styles.inputMeta}>
      <button 
        style={{...styles.sendButton, opacity: disabled ? 0.5 : 1}} 
        onClick={onSubmit}
        disabled={disabled}
      >
        <span style={styles.sendIcon}>➤</span>
      </button>
    </div>
  </div>
)

const ChatPanel: React.FC = () => {
  const [inputValue, setInputValue] = useState('')
  const [selectedReference, setSelectedReference] = useState<Reference | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  
  const { messages, streamingContent, streamingReferences, isSending, sendMessage, settings } = useChat()
  const md = new MarkdownIt({ breaks: true })

  // 格式化引用
  const formatReferences = (textContent: string, references: Reference[] = []): string => {
    // Render markdown first
    let html = md.render(textContent || '')
    
    // Handle new format [ID:\d+] in rendered HTML
    html = html.replace(/\[ID:(\d+)\]/g, (match: string, index: string) => {
      const refIndex = parseInt(index, 10)
      if (Array.isArray(references) && refIndex >= 0 && refIndex < references.length && references[refIndex]) {
        const ref = references[refIndex]
        return `<span class="citation-ref" data-ref-index="${refIndex}" data-dataset-id="${ref.dataset_id || ''}" data-document-id="${ref.document_id || ''}" data-chunk-id="${ref.id || ''}" style="color: #4f46e5; cursor: pointer; user-select: none; background: rgba(79, 70, 229, 0.1); padding: 2px 4px; border-radius: 4px; font-size: 12px;">[${index}]</span>`
      }
      return `<span style="color: #f87171;">[?]</span>`
    })
    
    // Handle parentheses format (ID:\d+) in rendered HTML
    html = html.replace(/\(ID:(\d+)\)/g, (match: string, index: string) => {
      const refIndex = parseInt(index, 10)
      if (Array.isArray(references) && refIndex >= 0 && refIndex < references.length && references[refIndex]) {
        const ref = references[refIndex]
        return `<span class="citation-ref" data-ref-index="${refIndex}" data-dataset-id="${ref.dataset_id || ''}" data-document-id="${ref.document_id || ''}" data-chunk-id="${ref.id || ''}" style="color: #4f46e5; cursor: pointer; user-select: none; background: rgba(79, 70, 229, 0.1); padding: 2px 4px; border-radius: 4px; font-size: 12px;">[${index}]</span>`
      }
      return `<span style="color: #f87171;">[?]</span>`
    })
    
    // Handle original format ##(\d+)\$\$ in rendered HTML
    html = html.replace(/##(\d+)\$\$/g, (match: string, index: string) => {
      const refIndex = parseInt(index, 10)
      if (Array.isArray(references) && refIndex >= 0 && refIndex < references.length && references[refIndex]) {
        const ref = references[refIndex]
        return `<span class="citation-ref" data-ref-index="${refIndex}" data-dataset-id="${ref.dataset_id || ''}" data-document-id="${ref.document_id || ''}" data-chunk-id="${ref.id || ''}" style="color: #4f46e5; cursor: pointer; user-select: none; background: rgba(79, 70, 229, 0.1); padding: 2px 4px; border-radius: 4px; font-size: 12px;">[${index}]</span>`
      }
      return `<span style="color: #f87171;">[?]</span>`
    })
    
    return html
  }

  // 渲染 HTML 內容
  const renderHtmlContent = (htmlContent: string, textBefore: string = '', textAfter: string = '', references: Reference[] = [], isStreaming: boolean = false) => {
    let renderedHtmlContent;

    // 提取引用標記並轉換為可點擊的引用
    const citationMatches = htmlContent.match(/##(\d+)\$\$/g) || []
    const idCitationMatches = htmlContent.match(/\[ID:(\d+)\]/g) || []
    const parenCitationMatches = htmlContent.match(/\(ID:(\d+)\)/g) || []
    
    const citationNumbers = citationMatches.map(match => match.replace(/##(\d+)\$\$/, '$1'))
    const idCitationNumbers = idCitationMatches.map(match => match.replace(/\[ID:(\d+)\]/, '$1'))
    const parenCitationNumbers = parenCitationMatches.map(match => match.replace(/\(ID:(\d+)\)/, '$1'))
    
    // 合併所有引用編號
    const allCitationNumbers = [...citationNumbers, ...idCitationNumbers, ...parenCitationNumbers]
    
    // 清理 HTML 中的引用標記，避免在 iframe 中執行時報錯
    const cleanedHtmlContent = htmlContent.replace(/##\d+\$\$/g, '').replace(/\[ID:\d+\]/g, '').replace(/\(ID:\d+\)/g, '')
    console.log(cleanedHtmlContent);

    // 使用新的驗證工具
    const validationResult = validateHtml(cleanedHtmlContent);

    // 生成引用列表
    const citationList = allCitationNumbers.map(num => {
      const refIndex = parseInt(num, 10)
      if (Array.isArray(references) && refIndex >= 0 && refIndex < references.length && references[refIndex]) {
        const ref = references[refIndex]
        return `<span class="citation-ref" data-ref-index="${refIndex}" data-dataset-id="${ref.dataset_id || ''}" data-document-id="${ref.document_id || ''}" data-chunk-id="${ref.id || ''}" style="color: #4f46e5; cursor: pointer; user-select: none; background: rgba(79, 70, 229, 0.1); padding: 2px 6px; margin: 0 4px; border-radius: 4px; font-size: 12px; display: inline-block;">[${num}]</span>`
      }
      return `<span style="color: #f87171; padding: 2px 6px; margin: 0 4px; border-radius: 4px; font-size: 12px; display: inline-block;">[?]</span>`
    }).join('')

    renderedHtmlContent = (
      <>
        {validationResult.isValid ? (
          <div style={styles.iframeContainer}>
            <iframe
              srcDoc={cleanedHtmlContent}
              style={styles.iframe}
              sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation allow-popups"
              title="Embedded content"
            />
          </div>
        ) : (
          <div style={{ color: '#aaa', padding: '12px', background: '#efe', borderRadius: '8px', marginBottom: '12px' }}>
          {isStreaming ? '嘗試繪圖中，請稍候...' : '偵測到來源資訊不足，請提供更多資料，或自行確認資料內容。'}
          {!isStreaming && (
              <div style={{ marginTop: '8px', fontSize: '14px', color: '#666', display: 'none'}}>
                {Object.entries(validationResult.errors).map(([category, errors]) => (
                  <div key={category} style={{ marginBottom: '4px' }}>
                    <div style={{ fontWeight: 500 }}>{getCategoryName(category)}：</div>
                    <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          {!isStreaming && (
            <div style={styles.iframeContainer}>
              <iframe
                srcDoc={cleanedHtmlContent}
                style={styles.iframe}
                sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation allow-popups"
                title="Embedded content"
              />
            </div>
          )}
        </div>
        )}
        {citationList && (
          <div style={styles.citationContainer}>
            <div style={styles.citationLabel}>相關資料：</div>
            <div dangerouslySetInnerHTML={{ __html: citationList }} />
          </div>
        )}
      </>
    )


    return (
      <div>
        {textBefore && (
          <div dangerouslySetInnerHTML={{ __html: formatReferences(textBefore, references) }} />
        )}
        {renderedHtmlContent}
        {textAfter && (
          <div dangerouslySetInnerHTML={{ __html: formatReferences(textAfter, references) }} />
        )}
      </div>
    )
  }

  // 格式化消息內容
  const formatMessageContent = (content: string, references: Reference[] = []) => {
    // HTML code blocks
    const htmlBlockMatch = content.match(/```html\n([\s\S]*?)\n```/)
    if (htmlBlockMatch) {
      const htmlContent = htmlBlockMatch[1]
      const textBefore = content.substring(0, content.indexOf('```html')).trim()
      const textAfter = content.substring(content.indexOf('```', content.indexOf('```html') + 6) + 3).trim()
      return renderHtmlContent(htmlContent, textBefore, textAfter, references, isSending)
    }
    
    // 完整 HTML 文檔
    if (content && (content.includes('<!DOCTYPE html>') || content.includes('<html'))) {
      const htmlStart = content.indexOf('<!DOCTYPE html>') !== -1 ? content.indexOf('<!DOCTYPE html>') : content.indexOf('<html')
      const textBefore = content.substring(0, htmlStart).trim()
      
      const htmlEndTag = content.indexOf('</html>')
      let htmlContent = content.substring(htmlStart)
      let textAfter = ''
      
      if (htmlEndTag !== -1) {
        const htmlEnd = htmlEndTag + 7
        htmlContent = content.substring(htmlStart, htmlEnd)
        textAfter = content.substring(htmlEnd).trim()
      }
      
      return renderHtmlContent(htmlContent, textBefore, textAfter, references, isSending)
    }
    
    // 普通 markdown 內容
    return <div dangerouslySetInnerHTML={{ __html: formatReferences(content, references) }} />
  }

  // 處理引用點擊
  useEffect(() => {
    const handleCitationClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.classList.contains('citation-ref')) {
        const refIndex = parseInt(target.getAttribute('data-ref-index') || '-1')
        const dataset_id = target.getAttribute('data-dataset-id') || undefined
        const document_id = target.getAttribute('data-document-id') || undefined
        const id = target.getAttribute('data-chunk-id') || undefined
        
        let references: Reference[] = streamingReferences.length > 0 ? streamingReferences : 
          messages.find(msg => msg.references && msg.references.length > refIndex)?.references || []
        
        if (references && references[refIndex]) {
          setSelectedReference({ ...references[refIndex], dataset_id, document_id, id })
        }
      }
    }

    document.addEventListener('click', handleCitationClick)
    return () => document.removeEventListener('click', handleCitationClick)
  }, [messages, streamingReferences])

  // 自動滾動
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  const suggestedQuestions = [
    "台積電最近幾年在美國花了多少錢？",
    "目前川普關稅對於亞洲各國是多少？",
    "你能幫我做什麼？"
  ]

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isSending) return
    setInputValue('')
    await sendMessage(message)
  }

  // 檢查是否有設定 agentId
  if (!settings || !settings.agentId) {
    return (
      <div style={styles.panel}>
        <div style={styles.header}>
          <h1 style={styles.title}>對話</h1>
        </div>

        <div style={styles.content}>
          <div style={styles.noAgentContainer}>
            <div style={styles.noAgentIcon}>🤖</div>
            <div style={styles.noAgentMessage}>請選擇agent</div>
            <div style={styles.noAgentSubtext}>請先在設定中選擇一個AI助手開始對話</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h1 style={styles.title}>對話</h1>
      </div>

      <div style={styles.content}>
        <DocumentCard />

        {messages.length > 0 && (
          <div style={styles.messagesContainer}>
            {messages.map((message, index) => (
              <div key={index} style={styles.messageWrapper}>
                <div style={{
                  ...styles.message,
                  ...(message.role === 'user' ? styles.userMessage : styles.assistantMessage)
                }}>
                  {message.role === 'assistant' ? 
                    formatMessageContent(message.content, message.references || []) : 
                    message.content
                  }
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
                  {formatMessageContent(streamingContent, streamingReferences)}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        <div style={styles.chatInputSection}>
          <div style={styles.inputWrapper}>
            <ChatInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={() => handleSendMessage(inputValue)}
              disabled={isSending}
            />
            
            {messages.length === 0 && (
              <SuggestedQuestions
                questions={suggestedQuestions}
                onQuestionClick={handleSendMessage}
              />
            )}
          </div>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            LLM使用RAG技術，搭配可信資源來產生回應，但請務必查證。
          </p>
        </div>
      </div>

      <ReferenceModal 
        reference={selectedReference} 
        onClose={() => setSelectedReference(null)}
        settings={settings}
      />
    </div>
  )
}

// 輔助函數：獲取錯誤類別的中文名稱
const getCategoryName = (category: string): string => {
  const categoryNames: { [key: string]: string } = {
    structure: '結構問題',
    content: '內容問題',
    d3: 'D3.js 問題',
    quality: '代碼質量問題',
    variables: '變量問題'
  };
  return categoryNames[category] || category;
};

const styles: { [key: string]: React.CSSProperties } = {
  // 基本佈局
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

  // 文檔卡片
  documentCard: {
    display: 'flex',
    gap: '16px',
    padding: '24px',
    background: '#f8f9fa',
    borderRadius: '12px',
    marginBottom: '32px',
  },
  documentIcon: { fontSize: '32px', flexShrink: 0 },
  documentInfo: { flex: 1 },
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

  // 聊天區域
  messagesContainer: {
    overflowY: 'auto',
    padding: '0 0 20px 0',
    height: '100%',
  },
  messageWrapper: { marginBottom: '16px' },
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
  loadingDots: { display: 'inline-flex', gap: '2px' },

  // 輸入區域
  chatInputSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  inputWrapper: { width: '100%' },
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
  sendIcon: { fontSize: '14px' },

  // 建議問題
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
  suggestionArrow: { color: '#1a73e8', fontSize: '12px' },

  // 模態框
  modalOverlay: {
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
  },
  modalContent: {
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
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  modalTitle: {
    margin: 0,
    color: '#1a202c',
    fontSize: '18px',
    fontWeight: 600,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#64748b',
    padding: '0',
    lineHeight: 1,
  },
  modalSection: { marginBottom: '16px' },
  sectionLabel: {
    fontWeight: 600,
    color: '#4f46e5',
    marginBottom: '8px',
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  sectionContent: {
    color: '#1a202c',
    fontSize: '16px',
    padding: '8px 12px',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  referenceContent: {
    color: '#374151',
    lineHeight: 1.6,
    fontSize: '14px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    maxHeight: '300px',
    overflow: 'auto',
  },
  modalFooter: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  modalButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },

  // iframe
  iframeContainer: {
    width: '100%',
    height: '300px',
    border: '1px solid #e8eaed',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
  },

  // 引用容器
  citationContainer: {
    marginTop: '12px',
    padding: '8px 12px',
    background: '#f8f9fa',
    borderRadius: '6px',
    border: '1px solid #e8eaed',
  },
  citationLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#5f6368',
    marginBottom: '4px',
  },

  // 底部
  footer: {
    marginTop: '24px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '12px',
    color: '#5f6368',
    margin: 0,
  },

  // 沒有選擇 agent 的狀態
  noAgentContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '40px 20px',
    textAlign: 'center',
  },
  noAgentIcon: {
    fontSize: '64px',
    marginBottom: '24px',
    opacity: 0.6,
  },
  noAgentMessage: {
    fontSize: '24px',
    fontWeight: 500,
    color: '#202124',
    marginBottom: '12px',
  },
  noAgentSubtext: {
    fontSize: '16px',
    color: '#5f6368',
    lineHeight: 1.5,
    maxWidth: '400px',
  },
}

export default ChatPanel 