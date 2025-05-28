import React from 'react'
import SimpleChat from '../components/SimpleChat'

const SimpleChatPage: React.FC = () => {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>AI Chat Assistant</h1>
      </div>
      <div style={styles.content}>
        <SimpleChat />
      </div>
      <div style={styles.footer}>
        <p style={styles.footerText}>© 2024 AI Chat Assistant</p>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#f0f4f8'
  },
  header: {
    padding: '20px',
    background: '#fff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  headerTitle: {
    margin: 0,
    fontSize: '24px',
    color: '#1a1a1a',
    fontWeight: 600
  },
  content: {
    flex: 1,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column'
  },
  footer: {
    padding: '20px',
    background: '#fff',
    textAlign: 'center',
    borderTop: '1px solid #e2e8f0'
  },
  footerText: {
    margin: 0,
    color: '#666',
    fontSize: '14px'
  }
}

export default SimpleChatPage 