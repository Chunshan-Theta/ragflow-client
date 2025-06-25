import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface Settings {
  apiUrl: string
  agentId: string
  apiKey: string
}

const WelcomePage: React.FC = () => {
  const navigate = useNavigate()
  const [hasSettings, setHasSettings] = useState(false)

  // Validate settings completeness
  const isValidSettings = (settings: any): settings is Settings => {
    return settings && 
           typeof settings.apiUrl === 'string' && settings.apiUrl.trim() !== '' &&
           typeof settings.agentId === 'string' && settings.agentId.trim() !== '' &&
           typeof settings.apiKey === 'string' && settings.apiKey.trim() !== ''
  }

  useEffect(() => {
    // Check if settings exist in localStorage
    const savedSettings = localStorage.getItem('chatSettings')
    
    if (!savedSettings) {
      setHasSettings(false)
      return
    }

    try {
      const parsedSettings = JSON.parse(savedSettings)
      setHasSettings(isValidSettings(parsedSettings))
    } catch (error) {
      // Corrupted settings, clear them
      localStorage.removeItem('chatSettings')
      setHasSettings(false)
    }
  }, [])

  const handleChatClick = () => {
    if (hasSettings) {
      navigate('/chat')
    } else {
      alert('Please configure your settings first')
      navigate('/settings')
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>AI Chat Assistant</h1>
        <p style={styles.subtitle}>Choose your action to get started</p>
        
        <div style={styles.buttonContainer}>
          <button 
            onClick={() => navigate('/settings')}
            style={styles.button}
          >
            <div style={styles.buttonIcon}>⚙️</div>
            <div style={styles.buttonText}>Settings</div>
            <div style={styles.buttonDescription}>
              Configure API credentials and select agent
            </div>
          </button>

          <button 
            onClick={handleChatClick}
            style={{
              ...styles.button,
              ...(hasSettings ? {} : styles.disabledButton)
            }}
            disabled={!hasSettings}
          >
            <div style={styles.buttonIcon}>💬</div>
            <div style={styles.buttonText}>Chat</div>
            <div style={styles.buttonDescription}>
              {hasSettings ? 'Start chatting with your agent' : 'Configure settings first'}
            </div>
          </button>

          <button 
            onClick={() => navigate('/knowledge')}
            style={{
              ... styles.button,
              ...(hasSettings ? {} : styles.disabledButton)
            }}
            disabled={!hasSettings}
          >
            <div style={styles.buttonIcon}>📚</div>
            <div style={styles.buttonText}>Knowledge Base</div>
            <div style={styles.buttonDescription}>
            {hasSettings ? 'Upload and manage documents' : 'Configure settings first'}
            </div>
          </button>

          <button 
            onClick={() => navigate('/notebook')}
            style={{
              ... styles.button,
              ...(hasSettings ? {} : styles.disabledButton)
            }}
            disabled={!hasSettings}
          >
            <div style={styles.buttonIcon}>🤖</div>
            <div style={styles.buttonText}>NotebookLM Style</div>
            <div style={styles.buttonDescription}>
            {hasSettings ? 'Upload documents and chat in one interface' : 'Configure settings first'}
            </div>
          </button>
        </div>

        {!hasSettings && (
          <div style={styles.notice}>
            <p style={styles.noticeText}>
              🔧 You need to configure your settings before you can start chatting
            </p>
          </div>
        )}

        {hasSettings && (
          <div style={styles.successNotice}>
            <p style={styles.successText}>
              ✅ Settings configured! You can now start chatting.
            </p>
          </div>
        )}
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
    background: 'linear-gradient(rgb(26, 31, 44), rgb(45, 55, 72))',
    color: '#fff'
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px'
  },
  title: {
    fontSize: '48px',
    fontWeight: 700,
    marginBottom: '16px',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  subtitle: {
    fontSize: '20px',
    color: '#e2e8f0',
    marginBottom: '48px',
    textAlign: 'center'
  },
  buttonContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    maxWidth: '600px',
    width: '100%'
  },
  button: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '32px 24px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    textAlign: 'center',
    color: '#fff'
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  buttonIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  buttonText: {
    fontSize: '24px',
    fontWeight: 600,
    marginBottom: '8px'
  },
  buttonDescription: {
    fontSize: '14px',
    color: '#a0aec0',
    lineHeight: 1.4
  },
  notice: {
    marginTop: '32px',
    padding: '16px 24px',
    background: 'rgba(245, 101, 101, 0.1)',
    border: '1px solid rgba(245, 101, 101, 0.3)',
    borderRadius: '8px',
    textAlign: 'center'
  },
  noticeText: {
    margin: 0,
    color: '#fed7d7',
    fontSize: '14px'
  },
  successNotice: {
    marginTop: '32px',
    padding: '16px 24px',
    background: 'rgba(72, 187, 120, 0.1)',
    border: '1px solid rgba(72, 187, 120, 0.3)',
    borderRadius: '8px',
    textAlign: 'center'
  },
  successText: {
    margin: 0,
    color: '#c6f6d5',
    fontSize: '14px'
  },
  footer: {
    padding: '20px',
    textAlign: 'center',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
  },
  footerText: {
    margin: 0,
    color: '#a0aec0',
    fontSize: '14px'
  }
}

export default WelcomePage 