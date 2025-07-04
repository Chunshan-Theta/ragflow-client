import React, { useState } from 'react'
import SourcePanel from '../components/SourcePanel'
import ChatPanel from '../components/ChatPanel'
import '../styles/animations.css'
import AgentSelector from '../components/AgentSelector'

interface Agent {
  id: string
  name: string
  description: string
  icon: string
  color: string
  status: 'online' | 'offline' | 'busy'
}

const NotebookLMPage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (isMobile) {
    return <MobileLayout />
  }

  return (
    <div style={styles.container} className="notebook-container">
      {/* Left Sidebar Toggle Button */}
      <button 
        style={styles.toggleButton}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? '‹' : '›'}
      </button>

      {/* Right Sidebar Toggle Button */}
      <button 
        style={{...styles.rightToggleButton, display: 'none'}}
        onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}

      >
        {isRightSidebarOpen ? '›' : '‹'}
      </button>

      {/* Left Sidebar - Source Panel */}
      <div style={{
        ...styles.sidebar,
        transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
      }}>
        <SourcePanel />
      </div>

      {/* Right Sidebar - Agent Selector */}
      <div style={{
        ...styles.rightSidebar,
        transform: isRightSidebarOpen ? 'translateX(0)' : 'translateX(100%)',
        display: 'none'
      }}>
        <AgentSelector />
      </div>

      {/* Main Chat Area */}
      <div style={{
        ...styles.mainArea,
        marginLeft: isSidebarOpen ? '380px' : '0px',
        marginRight: isRightSidebarOpen ? '380px' : '0px',
      }}>
        <ChatPanel />
      </div>
    </div>
  )
}

const MobileLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'chat' | 'agent'>('upload')

  return (
    <div style={styles.mobileContainer}>
      {/* Tab Bar */}
      <div style={styles.tabBar}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'upload' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('upload')}
        >
          <span style={styles.tabIcon}>📁</span>
          <span>來源</span>
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'chat' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('chat')}
        >
          <span style={styles.tabIcon}>💬</span>
          <span>對話</span>
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'agent' ? styles.activeTab : {}),
            display: 'none'
          }}
          onClick={() => setActiveTab('agent')}
        >
          <span style={styles.tabIcon}>🤖</span>
          <span>助手</span>
        </button>
      </div>
      
      {/* Tab Content */}
      <div style={styles.tabContent}>
        {activeTab === 'upload' ? (
          <SourcePanel />
        ) : activeTab === 'chat' ? (
          <ChatPanel />
        ) : (
          // <AgentSelector/>
          <></>
        )}
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    height: '100vh',
    background: '#f8fafc',
    position: 'relative',
    overflow: 'hidden'
  },
  
  toggleButton: {
    position: 'fixed',
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1001,
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#64748b',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transition: 'all 0.3s ease',
  },

  rightToggleButton: {
    position: 'fixed',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1001,
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#64748b',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transition: 'all 0.3s ease',
  },

  sidebar: {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    width: '380px',
    transition: 'transform 0.3s ease',
    zIndex: 1000,
    overflow: 'hidden',
  },

  rightSidebar: {
    position: 'fixed',
    right: 0,
    top: 0,
    bottom: 0,
    width: '380px',
    transition: 'transform 0.3s ease',
    zIndex: 1000,
    overflow: 'hidden',
  },

  mainArea: {
    flex: 1,
    height: '100vh',
    transition: 'margin-left 0.3s ease',
    background: '#f8fafc',
    overflow: 'hidden',
  },

  // Mobile styles
  mobileContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#f8fafc',
  },

  tabBar: {
    display: 'flex',
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },

  tab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '16px 12px',
    background: 'transparent',
    border: 'none',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    borderBottom: '3px solid transparent',
  },

  activeTab: {
    color: '#4f46e5',
    borderBottomColor: '#4f46e5',
    background: 'rgba(79, 70, 229, 0.05)',
  },

  tabIcon: {
    fontSize: '16px',
  },

  tabContent: {
    flex: 1,
    overflow: 'hidden',
  },
}

export default NotebookLMPage 