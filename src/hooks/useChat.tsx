import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

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

export const useChat = () => {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState<string>("")
  const [streamingReferences, setStreamingReferences] = useState<Reference[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const sessionCreatedRef = useRef(false)
  const initialMessageSentRef = useRef(false)

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
        console.error("Failed to create session")
      }
    } catch (error) {
      console.error("Error creating session:", error)
    } finally {
      setIsLoading(false)
    }
  }, [settings])

  const sendMessage = useCallback(async (message: string, isInitial: boolean = false) => {
    if (!message || !sessionId || !settings || isSending) return
    
    setIsSending(true)
    
    if (!isInitial) {
      const userMessage: Message = { role: "user", content: message }
      setMessages(prev => [...prev, userMessage])
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

  // Load settings from localStorage
  const loadSettings = useCallback(() => {
    const savedSettings = localStorage.getItem('chatSettings')
    
    if (!savedSettings) {
      return
    }

    try {
      const parsedSettings = JSON.parse(savedSettings)
      
      if (isValidSettings(parsedSettings)) {
        setSettings(parsedSettings)
      }
    } catch (error) {
      console.error('Failed to parse settings')
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Listen for localStorage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'chatSettings') {
        loadSettings()
      }
    }

    // Listen for storage events from other tabs/windows
    window.addEventListener('storage', handleStorageChange)

    // Custom event for same-tab changes
    const handleCustomStorageChange = () => {
      loadSettings()
    }
    window.addEventListener('localStorageChange', handleCustomStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('localStorageChange', handleCustomStorageChange)
    }
  }, [loadSettings])

  // Create session when settings are loaded or agentId changes
  useEffect(() => {
    if (settings && settings.agentId) {
      // Reset session state when agentId changes
      sessionCreatedRef.current = false
      setSessionId(null)
      initialMessageSentRef.current = false
      // Clear messages when switching agents
      setMessages([])
      setStreamingContent("")
      setStreamingReferences([])
      
      createSession()
    }
  }, [settings?.agentId, createSession])

  // Send initial message when session is created (only once)
  useEffect(() => {
    if (sessionId && !initialMessageSentRef.current) {
      initialMessageSentRef.current = true
      sendMessage("hi", true)
    }
  }, [sessionId, sendMessage])

  return {
    messages,
    sessionId,
    streamingContent,
    streamingReferences,
    isLoading,
    isSending,
    settings,
    sendMessage
  }
}

export type { Message, Reference, Settings } 