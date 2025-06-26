import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface SettingsData {
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

const Settings: React.FC = () => {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<SettingsData>({
    apiUrl: process.env.REACT_APP_DEFAULT_API_URL || "",
    agentId: "",
    apiKey: process.env.REACT_APP_DEFAULT_API_KEY || ""
  })

  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>("")
  const [settingsStep, setSettingsStep] = useState<'credentials' | 'agent'>('credentials')
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('chatSettings')
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings)
      setSettings(parsedSettings)
      if (parsedSettings.agentId) {
        setSelectedAgent(parsedSettings.agentId)
      }
    }
  }, [])

  const fetchAgents = async () => {
    setLoading(true)
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
    } finally {
      setLoading(false)
    }
  }

  const saveCredentials = (e: React.FormEvent) => {
    e.preventDefault()
    fetchAgents()
  }

  const saveSettings = () => {
    const finalSettings = { ...settings, agentId: selectedAgent }
    localStorage.setItem('chatSettings', JSON.stringify(finalSettings))
    alert('Settings saved successfully!')
    navigate('/notebook')
  }

  const resetSettings = () => {
    localStorage.removeItem('chatSettings')
    setSettings({
      apiUrl: process.env.REACT_APP_DEFAULT_API_URL || "",
      agentId: "",
      apiKey: process.env.REACT_APP_DEFAULT_API_KEY || ""
    })
    setSelectedAgent("")
    setSettingsStep('credentials')
    setAgents([])
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Settings</h1>
        <button 
          onClick={() => navigate('/')}
          style={styles.backButton}
        >
          Back to Home
        </button>
      </div>

      <div style={styles.content}>
        {settingsStep === 'credentials' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>API Configuration</h2>
            <form onSubmit={saveCredentials} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>API URL:</label>
                <input
                  type="text"
                  value={settings.apiUrl}
                  onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>API Key:</label>
                <input
                  type="text"
                  value={settings.apiKey}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>

              <button 
                type="submit" 
                style={styles.button}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load Agents'}
              </button>
            </form>
          </div>
        )}

        {settingsStep === 'agent' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Select Agent</h2>
            <div style={styles.agentGrid}>
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  style={{
                    ...styles.agentCard,
                    ...(selectedAgent === agent.id ? styles.selectedAgent : {}),
                    ...(hoveredAgentId === agent.id ? styles.hoveredAgent : {})
                  }}
                  onClick={() => setSelectedAgent(agent.id)}
                  onMouseEnter={() => setHoveredAgentId(agent.id)}
                  onMouseLeave={() => setHoveredAgentId(null)}
                >
                  <div style={styles.agentInfo}>
                    <h3 style={styles.agentTitle}>{agent.title}</h3>
                    {agent.description && (
                      <p style={styles.agentDescription}>{agent.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.actionButtons}>
              <button 
                onClick={() => setSettingsStep('credentials')}
                style={styles.secondaryButton}
              >
                Back
              </button>
              <button 
                onClick={saveSettings}
                disabled={!selectedAgent}
                style={{
                  ...styles.button,
                  ...(selectedAgent ? {} : styles.disabledButton)
                }}
              >
                Save & Go to Chat
              </button>
            </div>
          </div>
        )}

        <div style={styles.resetSection}>
          <button 
            onClick={resetSettings}
            style={styles.resetButton}
          >
            Reset All Settings
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(rgb(26, 31, 44), rgb(45, 55, 72))',
    color: '#fff'
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
    fontWeight: 600
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#fff',
    border: '1px solid #fff',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  content: {
    padding: '40px',
    maxWidth: '800px',
    margin: '0 auto'
  },
  section: {
    marginBottom: '40px'
  },
  sectionTitle: {
    fontSize: '20px',
    marginBottom: '20px',
    color: '#e2e8f0'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#e2e8f0'
  },
  input: {
    padding: '12px',
    border: '1px solid #4a5568',
    borderRadius: '4px',
    backgroundColor: '#2d3748',
    color: '#fff',
    fontSize: '14px'
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  secondaryButton: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: '#e2e8f0',
    border: '1px solid #4a5568',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  disabledButton: {
    backgroundColor: '#4a5568',
    cursor: 'not-allowed'
  },
  agentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
    marginBottom: '30px'
  },
  agentCard: {
    padding: '20px',
    border: '1px solid #4a5568',
    borderRadius: '8px',
    backgroundColor: '#2d3748',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  selectedAgent: {
    borderColor: '#4f46e5',
    backgroundColor: '#4c51bf'
  },
  hoveredAgent: {
    borderColor: '#6b7280',
    backgroundColor: '#374151'
  },
  agentInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  agentTitle: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: '600'
  },
  agentDescription: {
    margin: 0,
    fontSize: '14px',
    color: '#a0aec0',
    lineHeight: '1.4'
  },
  actionButtons: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'flex-end'
  },
  resetSection: {
    paddingTop: '40px',
    borderTop: '1px solid #4a5568',
    textAlign: 'center'
  },
  resetButton: {
    padding: '10px 20px',
    backgroundColor: '#e53e3e',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  }
}

export default Settings 