import React, { useState, useEffect, useMemo } from 'react'

interface Agent {
  id: string
  name: string
  description: string
  icon: string
  color: string
  status: 'online' | 'offline' | 'busy'
}

interface Settings {
  apiUrl: string
  agentId: string
  apiKey: string
}

interface AgentSelectorProps {
  onAgentSelect?: (agent: Agent) => void
}

interface ApiAgent {
  id: string
  title: string
  description: string | null
  avatar: string | null
  create_date: string
  update_date: string
}

const AgentSelector: React.FC<AgentSelectorProps> = ({ onAgentSelect }) => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [apiAgents, setApiAgents] = useState<ApiAgent[]>([])
  const [loading, setLoading] = useState(false)

  // 将API agent转换为显示agent
  const convertApiAgentToDisplayAgent = (apiAgent: ApiAgent): Agent => {
    const icons = ['🤖', '🧠', '✨', '👨‍💼', '🎨', '💡', '🔍', '📊']
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316']
    
    return {
      id: apiAgent.id,
      name: apiAgent.title,
      description: apiAgent.description || '專業AI助手',
      icon: icons[Math.abs(apiAgent.id.charCodeAt(0)) % icons.length],
      color: colors[Math.abs(apiAgent.id.charCodeAt(0)) % colors.length],
      status: 'online' as const
    }
  }

  const agents: Agent[] = useMemo(() => 
    apiAgents.map(convertApiAgentToDisplayAgent), 
    [apiAgents]
  )

  // 获取可用的助手
  const fetchAgents = async () => {
    if (!settings) return
    
    setLoading(true)
    try {
      const response = await fetch(`${settings.apiUrl}/api/v1/agents`.replace(/([^:]\/)\/+/g, "$1"), {
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
      const data = await response.json()
      if (data.code === 0 && Array.isArray(data.data)) {
        setApiAgents(data.data)
      } else {
        console.error("No agents available")
      }
    } catch (error) {
      console.error("Error fetching agents:", error)
    } finally {
      setLoading(false)
    }
  }

  // 从 localStorage 加载设置
  useEffect(() => {
    const savedSettings = localStorage.getItem('chatSettings')
    if (savedSettings) {
      try {
        const parsedSettings: Settings = JSON.parse(savedSettings)
        setSettings(parsedSettings)
      } catch (error) {
        console.error('Failed to parse settings')
      }
    }
  }, [])

  // 当设置加载后获取助手列表
  useEffect(() => {
    if (settings && settings.apiUrl && settings.apiKey) {
      fetchAgents()
    }
  }, [settings])

  // 当助手列表和设置都加载后，设置选中的助手
  useEffect(() => {
    if (settings && settings.agentId && agents.length > 0) {
      const foundAgent = agents.find(agent => agent.id === settings.agentId)
      if (foundAgent) {
        setSelectedAgent(foundAgent)
      }
    }
  }, [agents, settings])

  // 处理助手选择
  const handleAgentSelect = (agent: Agent) => {
    // 更新本地状态
    setSelectedAgent(agent)
    
    // 更新 localStorage 中的设置
    if (settings) {
      const updatedSettings = { ...settings, agentId: agent.id }
      localStorage.setItem('chatSettings', JSON.stringify(updatedSettings))
      setSettings(updatedSettings)
      
      // 触发自定义事件通知其他组件
      window.dispatchEvent(new Event('localStorageChange'))
    }
    
    // 调用回调函数
    onAgentSelect?.(agent)
  }

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'online': return '#10b981'
      case 'busy': return '#f59e0b'
      case 'offline': return '#64748b'
      default: return '#64748b'
    }
  }

  const getStatusText = (status: Agent['status']) => {
    switch (status) {
      case 'online': return '已上線'
      case 'busy': return '忙碌'
      case 'offline': return '离线'
      default: return '未知'
    }
  }

  return (
    <div style={styles.container}>
      {/* 头部 */}
      <div style={styles.header}>
        <h2 style={styles.title}>選擇助手</h2>
        <p style={styles.subtitle}>選擇一個助手開始對話</p>
      </div>

      {/* 当前选中的助手 */}
      {selectedAgent && (
        <div style={styles.selectedSection}>
          <div style={styles.selectedLabel}>當前助手</div>
          <div style={{
            ...styles.agentCard,
            ...styles.selectedAgent,
            borderColor: selectedAgent.color
          }}>
            <div style={styles.agentHeader}>
              <span style={styles.agentIcon}>{selectedAgent.icon}</span>
              <div style={styles.agentInfo}>
                <h3 style={styles.agentName}>{selectedAgent.name}</h3>
                <div style={styles.statusContainer}>
                  <div style={{
                    ...styles.statusDot,
                    backgroundColor: getStatusColor(selectedAgent.status)
                  }} />
                  <span style={styles.statusText}>{getStatusText(selectedAgent.status)}</span>
                </div>
              </div>
            </div>
            <p style={styles.agentDescription}>{selectedAgent.description}</p>
          </div>
        </div>
      )}

      {/* 助手列表 */}
      <div style={styles.agentsList}>
        <div style={styles.sectionLabel}>可用助手</div>
        
        {loading && (
          <div style={styles.loadingContainer}>
            <div style={styles.loadingText}>正在加载助手...</div>
          </div>
        )}

        {!loading && !settings && (
          <div style={styles.noSettingsContainer}>
            <div style={styles.noSettingsText}>请先在设置中配置 API 信息</div>
          </div>
        )}

        {!loading && agents.length === 0 && settings && (
          <div style={styles.noAgentsContainer}>
            <div style={styles.noAgentsText}>暂无可用助手</div>
          </div>
        )}

        {!loading && agents.map((agent) => (
          <div
            key={agent.id}
            style={{
              ...styles.agentCard,
              ...(selectedAgent?.id === agent.id ? styles.selectedAgent : {}),
              borderColor: selectedAgent?.id === agent.id ? agent.color : '#e2e8f0',
              cursor: agent.status === 'offline' ? 'not-allowed' : 'pointer',
              opacity: agent.status === 'offline' ? 0.6 : 1
            }}
                         onClick={() => {
               if (agent.status !== 'offline') {
                 handleAgentSelect(agent)
               }
             }}
          >
            <div style={styles.agentHeader}>
              <span style={styles.agentIcon}>{agent.icon}</span>
              <div style={styles.agentInfo}>
                <h3 style={styles.agentName}>{agent.name}</h3>
                <div style={styles.statusContainer}>
                  <div style={{
                    ...styles.statusDot,
                    backgroundColor: getStatusColor(agent.status)
                  }} />
                  <span style={styles.statusText}>{getStatusText(agent.status)}</span>
                </div>
              </div>
            </div>
            <p style={styles.agentDescription}>{agent.description}</p>
          </div>
        ))}
      </div>

      {/* 底部信息 */}
      <div style={styles.footer}>
        <div style={styles.footerText}>
          <span style={styles.footerIcon}>💡</span>
          <span>提示：助手思考流程與回應方式皆由產商設計與開發，有更新需求請聯繫廠商</span>
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    height: '100%',
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  header: {
    padding: '24px 20px 16px',
    borderBottom: '1px solid #f1f5f9',
  },

  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 4px 0',
  },

  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },

  selectedSection: {
    padding: '16px 20px',
    borderBottom: '1px solid #f1f5f9',
  },

  selectedLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },

  agentsList: {
    flex: 1,
    padding: '16px 20px',
    overflowY: 'auto' as const,
  },

  sectionLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '12px',
  },

  agentCard: {
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
    transition: 'all 0.2s ease',
    background: '#fff',
  },

  selectedAgent: {
    background: 'rgba(79, 70, 229, 0.02)',
    borderColor: '#4f46e5',
  },

  agentHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
  },

  agentIcon: {
    fontSize: '24px',
    marginRight: '12px',
  },

  agentInfo: {
    flex: 1,
  },

  agentName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 4px 0',
  },

  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },

  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },

  statusText: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
  },

  agentDescription: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.4,
  },

  footer: {
    padding: '16px 20px',
    borderTop: '1px solid #f1f5f9',
    background: '#f8fafc',
  },

  footerText: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#64748b',
  },

  footerIcon: {
    fontSize: '14px',
  },

  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 20px',
  },

  loadingText: {
    fontSize: '14px',
    color: '#64748b',
  },

  noSettingsContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 20px',
    background: '#fef2f2',
    borderRadius: '8px',
    border: '1px solid #fecaca',
  },

  noSettingsText: {
    fontSize: '14px',
    color: '#dc2626',
  },

  noAgentsContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 20px',
    background: '#fffbeb',
    borderRadius: '8px',
    border: '1px solid #fed7aa',
  },

  noAgentsText: {
    fontSize: '14px',
    color: '#d97706',
  },
}

export default AgentSelector 