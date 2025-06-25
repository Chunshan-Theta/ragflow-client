import React, { useEffect } from 'react'
import KnowledgeBaseUpload from './KnowledgeBaseUpload'

const KnowledgeBaseWrapper: React.FC = () => {
  useEffect(() => {
    // 添加全局样式覆盖
    const style = document.createElement('style')
    style.textContent = `
      .knowledge-wrapper .dataset-card {
        background: #f8fafc !important;
        border: 1px solid #e2e8f0 !important;
        color: #1a202c !important;
      }
      .knowledge-wrapper .dataset-card.selected {
        border: 2px solid #4f46e5 !important;
        background: rgba(79, 70, 229, 0.05) !important;
      }
      .knowledge-wrapper * {
        color: #1a202c !important;
      }
    `
    document.head.appendChild(style)
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style)
      }
    }
  }, [])
  
  return (
    <div style={styles.wrapper} className="knowledge-wrapper">
      <div style={styles.header}>
        <h2 style={styles.title}>Knowledge Base</h2>
        <p style={styles.subtitle}>Upload and manage your documents</p>
      </div>
      
      <div style={styles.content}>
        <KnowledgeBaseUpload />
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#fff',
  },
  
  header: {
    padding: '24px 24px 16px 24px',
    borderBottom: '1px solid #e2e8f0',
    background: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  
  title: {
    margin: '0 0 4px 0',
    fontSize: '20px',
    fontWeight: 600,
    color: '#1a202c',
  },
  
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#64748b',
  },
  
  content: {
    flex: 1,
    overflow: 'auto',
    background: '#fff',
    padding: '20px',
  },
}

export default KnowledgeBaseWrapper 