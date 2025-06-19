import React, { useEffect } from 'react'
import KnowledgeBaseUpload from '../components/KnowledgeBaseUpload'

const KnowledgeBasePage: React.FC = () => {
  useEffect(() => {
    // 添加 CSS 動畫
    const style = document.createElement('style')
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <div style={styles.container}>
      <KnowledgeBaseUpload />
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(rgb(26, 31, 44), rgb(45, 55, 72))',
    color: '#fff'
  }
}

export default KnowledgeBasePage 