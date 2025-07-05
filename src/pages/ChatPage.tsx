import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, message, Card, List, Typography, Upload, Space, Divider, Modal, Form, Select, Slider, InputNumber, Switch } from 'antd';
import { LeftOutlined, RightOutlined, UploadOutlined } from '@ant-design/icons';
import '../styles/ChatPage.css';

const { Text } = Typography;

interface Dataset {
  id: string;
  name: string;
  description?: string | null;
  create_time: number;
  update_time: number;
  create_date: string;
  update_date: string;
  document_count: number;
  chunk_count: number;
  language: string;
  status: string;
  embedding_model: string;
  token_num: number;
}

interface ChatAssistant {
  id: string;
  name: string;
  create_time: number;
  update_time: number;
  dataset_ids: string[];
  avatar?: string;
  llm?: {
    model_name?: string;
    temperature?: number;
    top_p?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
  };
  prompt?: {
    empty_response?: string;
    opener?: string;
    prompt?: string;
  };
}

interface ChatSession {
  id: string;
  name: string;
}

interface Settings {
  apiUrl: string;
  agentId: string;
  apiKey: string;
}

interface Reference {
  content: string;
  document_name: string;
  positions: number[][];
  document_id?: string;
  dataset_id?: string;
  id?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  references?: Reference[];
}

// 引用模態框組件
const ReferenceModal: React.FC<{
  reference: Reference | null;
  onClose: () => void;
}> = ({ reference, onClose }) => {
  if (!reference) return null;

  return (
    <div style={{
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
    }} onClick={onClose}>
      <div style={{
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
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '16px',
        }}>
          <h3 style={{
            margin: 0,
            color: '#1a202c',
            fontSize: '18px',
            fontWeight: 600,
          }}>引用資料來源</h3>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#64748b',
            padding: '0',
            lineHeight: 1,
          }}>×</button>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            fontWeight: 600,
            color: '#4f46e5',
            marginBottom: '8px',
            fontSize: '14px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>文件名稱</div>
          <div style={{
            color: '#1a202c',
            fontSize: '16px',
            padding: '8px 12px',
            backgroundColor: '#f8fafc',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
          }}>{reference.document_name}</div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{
            fontWeight: 600,
            color: '#4f46e5',
            marginBottom: '8px',
            fontSize: '14px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>引用內容</div>
          <div style={{
            color: '#374151',
            lineHeight: 1.6,
            fontSize: '14px',
            padding: '16px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            maxHeight: '300px',
            overflow: 'auto',
          }}>{reference.content}</div>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
        }}>
          <button onClick={onClose} style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#fff',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}>關閉</button>
        </div>
      </div>
    </div>
  );
};

const AssistantSettingsModal: React.FC<{
  assistant: ChatAssistant | null;
  visible: boolean;
  onClose: () => void;
  onUpdate: (assistant: ChatAssistant, updates: Partial<ChatAssistant>) => void;
  datasets: Dataset[];
}> = ({ assistant, visible, onClose, onUpdate, datasets }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible && assistant) {
      form.setFieldsValue({
        prompt: assistant.prompt || {}
      });
    }
  }, [visible, assistant, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (assistant) {
        onUpdate(assistant, values);
        onClose();
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  if (!assistant) return null;

  return (
    <Modal
      title="Edit Assistant Settings"
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          prompt: assistant.prompt || {}
        }}
      >
        <Form.Item name={['prompt', 'empty_response']} label="Empty Response">
          <Input.TextArea 
            rows={3}
            placeholder="Response when no relevant content is found" 
          />
        </Form.Item>
        
        <Form.Item name={['prompt', 'opener']} label="Opening Message" style={{display: 'none'}}>
          <Input.TextArea 
            rows={2}
            placeholder="Hi! I am your assistant, can I help you?" 
            value="請開始對話"
          />
        </Form.Item>
        
        <Form.Item name={['prompt', 'prompt']} label="Custom Prompt">
          <Input.TextArea 
            rows={4} 
            placeholder="Enter custom prompt instructions" 
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

const ChatPage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [chatAssistants, setChatAssistants] = useState<ChatAssistant[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<ChatAssistant | null>(null);
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const currentMessageRef = useRef<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedReference, setSelectedReference] = useState<Reference | null>(null);
  const [streamingReferences, setStreamingReferences] = useState<Reference[]>([]);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<ChatAssistant | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } catch (error) {
        message.error('Failed to load settings. Please configure settings first.');
      }
    } else {
      message.error('No settings found. Please configure settings first.');
    }
  }, []);

  useEffect(() => {
    if (settings) {
      fetchDatasets();
      fetchChatAssistants();
    }
  }, [settings]);

  const fetchDatasets = async () => {
    if (!settings) return;

    try {
      const response = await fetch(`${settings.apiUrl}/api/v1/datasets`, {
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`
        }
      });
      
      const data = await response.json();
      if (data.code === 0 && Array.isArray(data.data)) {
        setDatasets(data.data);
      } else {
        message.error('Failed to fetch datasets');
      }
    } catch (error) {
      message.error('Error fetching datasets');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files);
  };

  const parseDocuments = async (documentIds: string[]) => {
    if (!settings || !selectedDatasetId || documentIds.length === 0) return;

    try {
      setParsing(true);
      const response = await fetch(`${settings.apiUrl}/api/v1/datasets/${selectedDatasetId}/chunks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          document_ids: documentIds
        })
      });

      if (!response.ok) {
        throw new Error(`Parse failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.code === 0) {
        message.success(`Successfully parsed ${documentIds.length} documents`);
      } else {
        throw new Error(`Parse API error: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Parse failed');
    } finally {
      setParsing(false);
    }
  };

  const handleUpload = async () => {
    if (!settings || !selectedDatasetId || !selectedFiles) {
      message.error('Please select a dataset and files first');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      Array.from(selectedFiles).forEach(file => {
        formData.append('file', file);
      });

      const response = await fetch(`${settings.apiUrl}/api/v1/datasets/${selectedDatasetId}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const uploadData = await response.json();
      if (uploadData.code === 0) {
        message.success(`Successfully uploaded ${selectedFiles.length} files`);
        
        let documentIds: string[] = [];
        if (uploadData.data) {
          if (Array.isArray(uploadData.data)) {
            documentIds = uploadData.data.map((doc: any) => doc.id).filter(Boolean);
          } else if (uploadData.data.document_ids && Array.isArray(uploadData.data.document_ids)) {
            documentIds = uploadData.data.document_ids;
          } else if (uploadData.data.id) {
            documentIds = [uploadData.data.id];
          }
        }

        if (documentIds.length > 0) {
          await parseDocuments(documentIds);
        }
        
        setSelectedFiles(null);
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        fetchDatasets();
      } else {
        throw new Error(`Upload API error: ${uploadData.message || 'Unknown error'}`);
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const fetchChatAssistants = async () => {
    if (!settings) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${settings.apiUrl}/api/v1/chats?page=1&page_size=30&orderby=update_time&desc=true`,
        {
          headers: {
            'Authorization': `Bearer ${settings.apiKey}`
          }
        }
      );

      const data = await response.json();
      if (data.code === 0 && Array.isArray(data.data)) {
        setChatAssistants(data.data);
      } else {
        message.error('Failed to fetch chat assistants');
      }
    } catch (error) {
      message.error('Error fetching chat assistants');
    } finally {
      setLoading(false);
    }
  };

  const createChatSession = async (assistant: ChatAssistant) => {
    if (!settings) {
      message.error('Please configure settings first');
      return;
    }

    try {
      const response = await fetch(`${settings.apiUrl}/api/v1/chats/${assistant.id}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          name: `Session_${Date.now()}`
        })
      });

      const data = await response.json();
      if (data.code === 0) {
        setChatSession(data.data);
        setSelectedAssistant(assistant);
        setMessages([]);
        message.success('Chat session created successfully!');
        await sendHiddenGreeting(assistant.id, data.data.id);
      } else {
        message.error(data.message);
      }
    } catch (error) {
      message.error('Failed to create chat session');
    }
  };

  const sendHiddenGreeting = async (assistantId: string, sessionId: string) => {
    if (!settings) return;

    try {
      const response = await fetch(`${settings.apiUrl}/api/v1/chats/${assistantId}/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          question: "hi",
          stream: true,
          session_id: sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('ReadableStream not supported');
      }

      const decoder = new TextDecoder();
      let partialLine = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = (partialLine + chunk).split('\n');
        partialLine = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (!line.startsWith('data:')) continue;

          const jsonStr = line.slice(5).trim();
          try {
            const data = JSON.parse(jsonStr);
            if (data.code === 0 && data.data === true) {
              break;
            }
          } catch (e) {
            console.error('Error parsing hidden greeting JSON:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error sending hidden greeting:', error);
    }
  };

  const sendMessage = async () => {
    if (!settings || !selectedAssistant || !chatSession || !inputMessage.trim()) return;

    const userMessage = { role: 'user' as const, content: inputMessage };
    const assistantMessage = { role: 'assistant' as const, content: '' };
    
    // Add user message and create a placeholder for assistant message
    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInputMessage('');
    setIsStreaming(true);
    setStreamingReferences([]);

    try {
      const response = await fetch(`${settings.apiUrl}/api/v1/chats/${selectedAssistant.id}/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          question: inputMessage,
          stream: true,
          session_id: chatSession.id
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('ReadableStream not supported');
      }

      const decoder = new TextDecoder();
      let partialLine = '';
      let lastAnswer = '';
      let accumulatedReferences: Reference[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = (partialLine + chunk).split('\n');
        partialLine = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (!line.startsWith('data:')) continue;

          const jsonStr = line.slice(5).trim();
          try {
            const data = JSON.parse(jsonStr);
            if (data.code === 0) {
              if (data.data === true) {
                // Don't update on the final true response
                break;
              } else if (data.data?.answer) {
                // Update only the assistant's message, keeping the user's message intact
                lastAnswer = data.data.answer;
                setMessages(prev => [
                  ...prev.slice(0, -1), // Keep all previous messages including user's
                  { 
                    role: 'assistant', 
                    content: lastAnswer,
                    references: accumulatedReferences 
                  } // Update only the assistant's message
                ]);
              }
              // Handle references
              if (data.data?.reference) {
                if (typeof data.data.reference === 'object') {
                  if (data.data.reference.chunks && Array.isArray(data.data.reference.chunks)) {
                    accumulatedReferences = data.data.reference.chunks.map((chunk: any) => ({
                      content: chunk.content,
                      document_name: chunk.document_name,
                      positions: chunk.positions || [],
                      dataset_id: chunk.dataset_id,
                      document_id: chunk.document_id,
                      id: chunk.id
                    }));
                    setStreamingReferences(accumulatedReferences);
                  } else if (Array.isArray(data.data.reference)) {
                    accumulatedReferences = [...accumulatedReferences, ...data.data.reference];
                    setStreamingReferences(accumulatedReferences);
                  }
                }
              }
            }
          } catch (e) {
            console.error('Error parsing JSON:', e);
          }
        }
      }
    } catch (error) {
      message.error('Failed to send message');
      console.error('Error:', error);
      // Remove only the assistant's message on error, keep the user's message
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
      setStreamingReferences([]);
    }
  };

  // 格式化引用
  const formatReferences = (textContent: string, references: Reference[] = []): string => {
    // Handle [ID:n] format
    let html = textContent.replace(/\[ID:(\d+)\]/g, (match: string, index: string) => {
      const refIndex = parseInt(index, 10);
      if (Array.isArray(references) && refIndex >= 0 && refIndex < references.length && references[refIndex]) {
        const ref = references[refIndex];
        return `<span class="citation-ref" data-ref-index="${refIndex}" data-dataset-id="${ref.dataset_id || ''}" data-document-id="${ref.document_id || ''}" data-chunk-id="${ref.id || ''}" style="color: #4f46e5; cursor: pointer; user-select: none; background: rgba(79, 70, 229, 0.1); padding: 2px 4px; border-radius: 4px; font-size: 12px;">[${index}]</span>`;
      }
      return `<span style="color: #f87171;">[?]</span>`;
    });
    
    // Handle (ID:n) format
    html = html.replace(/\(ID:(\d+)\)/g, (match: string, index: string) => {
      const refIndex = parseInt(index, 10);
      if (Array.isArray(references) && refIndex >= 0 && refIndex < references.length && references[refIndex]) {
        const ref = references[refIndex];
        return `<span class="citation-ref" data-ref-index="${refIndex}" data-dataset-id="${ref.dataset_id || ''}" data-document-id="${ref.document_id || ''}" data-chunk-id="${ref.id || ''}" style="color: #4f46e5; cursor: pointer; user-select: none; background: rgba(79, 70, 229, 0.1); padding: 2px 4px; border-radius: 4px; font-size: 12px;">[${index}]</span>`;
      }
      return `<span style="color: #f87171;">[?]</span>`;
    });
    
    // Handle ##n$$ format
    html = html.replace(/##(\d+)\$\$/g, (match: string, index: string) => {
      const refIndex = parseInt(index, 10);
      if (Array.isArray(references) && refIndex >= 0 && refIndex < references.length && references[refIndex]) {
        const ref = references[refIndex];
        return `<span class="citation-ref" data-ref-index="${refIndex}" data-dataset-id="${ref.dataset_id || ''}" data-document-id="${ref.document_id || ''}" data-chunk-id="${ref.id || ''}" style="color: #4f46e5; cursor: pointer; user-select: none; background: rgba(79, 70, 229, 0.1); padding: 2px 4px; border-radius: 4px; font-size: 12px;">[${index}]</span>`;
      }
      return `<span style="color: #f87171;">[?]</span>`;
    });
    
    return html;
  };

  // 處理引用點擊
  useEffect(() => {
    const handleCitationClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('citation-ref')) {
        const refIndex = parseInt(target.getAttribute('data-ref-index') || '-1');
        const dataset_id = target.getAttribute('data-dataset-id') || undefined;
        const document_id = target.getAttribute('data-document-id') || undefined;
        const id = target.getAttribute('data-chunk-id') || undefined;
        
        let references: Reference[] = streamingReferences.length > 0 ? streamingReferences : 
          messages.find(msg => msg.references && msg.references.length > refIndex)?.references || [];
        
        if (references && references[refIndex]) {
          setSelectedReference({ ...references[refIndex], dataset_id, document_id, id });
        }
      }
    };

    document.addEventListener('click', handleCitationClick);
    return () => document.removeEventListener('click', handleCitationClick);
  }, [messages, streamingReferences]);

  const updateAssistant = async (assistant: ChatAssistant, updates: Partial<ChatAssistant>) => {
    if (!settings) {
      message.error('Please configure settings first');
      return;
    }

    try {
      const response = await fetch(`${settings.apiUrl}/api/v1/chats/${assistant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      if (data.code === 0) {
        message.success('Assistant updated successfully!');
        // Update local state
        setChatAssistants(prev => prev.map(a => a.id === assistant.id ? { ...a, ...updates } : a));
        if (selectedAssistant?.id === assistant.id) {
          setSelectedAssistant(prev => prev ? { ...prev, ...updates } : prev);
        }
      } else {
        message.error(data.message || 'Failed to update assistant');
      }
    } catch (error) {
      message.error('Error updating assistant');
      console.error('Error:', error);
    }
  };

  const handleEditAssistant = (assistant: ChatAssistant) => {
    setEditingAssistant(assistant);
    setIsSettingsModalVisible(true);
  };

  if (!settings) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Please configure settings first</h2>
        <Button type="primary" onClick={() => window.location.href = '/'}>
          Go to Settings
        </Button>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div style={styles.mobileContainer}>
        <div style={styles.tabBar}>
          <Button onClick={() => setIsSidebarOpen(true)}>Knowledge Base</Button>
          <Button onClick={() => setIsRightSidebarOpen(true)}>Chats</Button>
        </div>
        <div style={styles.mobileContent}>
          {isSidebarOpen ? (
            <div style={styles.knowledgeBase}>
              <Card title="Knowledge Base" bordered={false}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  <div>
                    <Text strong>Select Dataset</Text>
                    <List
                      dataSource={datasets}
                      renderItem={item => (
                        <List.Item
                          onClick={() => setSelectedDatasetId(item.id)}
                          className={`dataset-item ${selectedDatasetId === item.id ? 'selected' : ''}`}
                        >
                          <Text>{item.name}</Text>
                          <Text type="secondary">{item.document_count} documents</Text>
                        </List.Item>
                      )}
                    />
                  </div>
                  <div>
                    <Text strong>Upload Files</Text>
                    <input
                      type="file"
                      id="fileInput"
                      multiple
                      onChange={handleFileChange}
                      style={{ marginBottom: '10px' }}
                    />
                    <Button
                      type="primary"
                      onClick={handleUpload}
                      loading={uploading || parsing}
                      disabled={!selectedDatasetId || !selectedFiles}
                      block
                    >
                      {uploading ? 'Uploading...' : parsing ? 'Parsing...' : 'Upload'}
                    </Button>
                  </div>
                </Space>
              </Card>
            </div>
          ) : isRightSidebarOpen ? (
            <List
              loading={loading}
              dataSource={chatAssistants}
              renderItem={item => (
                <List.Item onClick={() => createChatSession(item)} style={styles.chatItem}>
                  <Text>{item.name}</Text>
                  <Button 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditAssistant(item);
                    }}
                  >
                    設定
                  </Button>
                </List.Item>
              )}
            />
          ) : (
            <div style={styles.chatContainer}>
              {/* Chat messages */}
              <div style={styles.messagesContainer}>
                {messages.map((message, index) => (
                  <div key={index} style={{
                    ...styles.messageWrapper,
                    display: 'flex',
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                  }}>
                    <div style={{
                      ...styles.message,
                      ...(message.role === 'user' ? styles.userMessage : styles.assistantMessage)
                    }}>
                      {message.role === 'assistant' ? (
                        <div>
                          <div dangerouslySetInnerHTML={{ __html: formatReferences(message.content, message.references) }} />
                          {message.references && message.references.length > 0 && (
                            <div style={styles.citationContainer}>
                              <div style={styles.citationLabel}>參考資料：</div>
                              <div>
                                {message.references.map((ref, idx) => (
                                  <span
                                    key={idx}
                                    className="citation-ref"
                                    data-ref-index={idx}
                                    data-dataset-id={ref.dataset_id}
                                    data-document-id={ref.document_id}
                                    data-chunk-id={ref.id}
                                    style={{
                                      color: '#4f46e5',
                                      cursor: 'pointer',
                                      userSelect: 'none',
                                      background: 'rgba(79, 70, 229, 0.1)',
                                      padding: '2px 6px',
                                      margin: '0 4px',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      display: 'inline-block'
                                    }}
                                  >
                                    [{idx}]
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'right' }}>{message.content}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {isStreaming && (
                <div style={styles.messageWrapper}>
                  <div style={styles.loadingMessage}>
                    <div style={styles.loadingDots} className="loading-dots">
                      <span>.</span><span>.</span><span>.</span>
                    </div>
                  </div>
                </div>
              )}
              {/* Input area */}
              <div style={styles.inputContainer}>
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onPressEnter={sendMessage}
                  placeholder="Type your message..."
                  disabled={isStreaming}
                />
                <Button
                  type="primary"
                  onClick={sendMessage}
                  loading={isStreaming}
                  disabled={isStreaming}
                >
                  Send
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Left Sidebar Toggle Button */}
      <button 
        style={styles.toggleButton}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <LeftOutlined /> : <RightOutlined />}
      </button>

      {/* Right Sidebar Toggle Button */}
      <button 
        style={styles.rightToggleButton}
        onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
      >
        {isRightSidebarOpen ? <RightOutlined /> : <LeftOutlined />}
      </button>

      {/* Left Sidebar - Knowledge Base */}
      <div style={{
        ...styles.sidebar,
        transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
      }}>
        <Card title="Knowledge Base" bordered={false}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Text strong style={{ fontSize: '16px', marginBottom: '16px', display: 'block' }}>
                Select Dataset
              </Text>
              <List
                dataSource={datasets}
                renderItem={item => (
                  <div
                    style={{
                      ...styles.datasetItem,
                      ...(selectedDatasetId === item.id ? {
                        borderColor: '#1890ff',
                        background: '#f0f7ff',
                      } : {})
                    }}
                    onClick={() => setSelectedDatasetId(item.id)}
                  >
                    <div style={styles.datasetName}>{item.name}</div>
                    <div style={styles.datasetCount}>
                      {item.document_count} {item.document_count > 1 ? 'documents' : 'document'}
                    </div>
                  </div>
                )}
              />
            </div>
            <div style={styles.uploadSection}>
              <Text strong style={{ fontSize: '16px', marginBottom: '16px', display: 'block' }}>
                Upload Files
              </Text>
              <input
                type="file"
                id="fileInput"
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.txt,.md"
              />
              <label
                htmlFor="fileInput"
                style={{
                  ...styles.uploadButton,
                  ...(selectedFiles ? styles.uploadButtonHover : {})
                }}
              >
                <span style={styles.uploadText}>
                  <UploadOutlined />
                  {selectedFiles
                    ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} selected`
                    : 'Click to upload files'}
                </span>
              </label>
              <Button
                type="primary"
                onClick={handleUpload}
                loading={uploading || parsing}
                disabled={!selectedDatasetId || !selectedFiles}
                style={{ marginTop: '12px', width: '100%' }}
              >
                {uploading ? 'Uploading...' : parsing ? 'Parsing...' : 'Upload'}
              </Button>
            </div>
          </Space>
        </Card>
      </div>

      {/* Main Chat Area */}
      <div style={{
        ...styles.mainArea,
        marginLeft: isSidebarOpen ? '28vw' : '3vw',
        marginRight: isRightSidebarOpen ? '28vw' : '3vw',
        width: `calc(100% - ${isSidebarOpen ? '28vw' : '3vw'} - ${isRightSidebarOpen ? '28vw' : '3vw'})`,
      }}>
        <div style={styles.chatContainer}>
          {selectedAssistant ? (
            <>
              {/* Chat messages */}
              <div style={styles.messagesContainer} id="chat-messages">
                {messages.map((message, index) => (
                  <div key={index} style={{
                    ...styles.messageWrapper,
                    display: 'flex',
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                  }}>
                    <div style={{
                      ...styles.message,
                      ...(message.role === 'user' ? styles.userMessage : styles.assistantMessage)
                    }}>
                      {message.role === 'assistant' ? (
                        <div>
                          <div dangerouslySetInnerHTML={{ __html: formatReferences(message.content, message.references) }} />
                          {message.references && message.references.length > 0 && (
                            <div style={styles.citationContainer}>
                              <div style={styles.citationLabel}>參考資料：</div>
                              <div>
                                {message.references.map((ref, idx) => (
                                  <span
                                    key={idx}
                                    className="citation-ref"
                                    data-ref-index={idx}
                                    data-dataset-id={ref.dataset_id}
                                    data-document-id={ref.document_id}
                                    data-chunk-id={ref.id}
                                    style={{
                                      color: '#4f46e5',
                                      cursor: 'pointer',
                                      userSelect: 'none',
                                      background: 'rgba(79, 70, 229, 0.1)',
                                      padding: '2px 6px',
                                      margin: '0 4px',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      display: 'inline-block'
                                    }}
                                  >
                                    [{idx}]
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'right' }}>{message.content}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {isStreaming && (
                <div style={styles.messageWrapper}>
                  <div style={styles.loadingMessage}>
                    <div style={styles.loadingDots} className="loading-dots">
                      <span>.</span><span>.</span><span>.</span>
                    </div>
                  </div>
                </div>
              )}
              {/* Input area */}
              <div style={styles.inputContainer}>
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onPressEnter={sendMessage}
                  placeholder="Type your message..."
                  disabled={isStreaming}
                  style={{ flex: 1 }}
                />
                <Button
                  type="primary"
                  onClick={sendMessage}
                  loading={isStreaming}
                  disabled={isStreaming}
                >
                  Send
                </Button>
              </div>
            </>
          ) : (
            <div style={styles.noChat}>
              <Text>Select a chat assistant to start conversation</Text>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Chat List */}
      <div style={{
        ...styles.rightSidebar,
        transform: isRightSidebarOpen ? 'translateX(0)' : 'translateX(100%)',
      }}>
        <Card title="Chat Assistants" bordered={false}>
          <List
            loading={loading}
            dataSource={chatAssistants}
            renderItem={item => (
              <List.Item 
                onClick={() => createChatSession(item)} 
                className={`chat-item ${selectedAssistant?.id === item.id ? 'selected' : ''}`}
                actions={[
                  <Button 
                    key="edit" 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditAssistant(item);
                    }}
                  >
                    Edit
                  </Button>
                ]}
              >
                <Text>{item.name}</Text>
              </List.Item>
            )}
          />
        </Card>
      </div>

      {/* Add ReferenceModal */}
      <ReferenceModal 
        reference={selectedReference}
        onClose={() => setSelectedReference(null)}
      />

      {/* Assistant Settings Modal */}
      <AssistantSettingsModal
        assistant={editingAssistant}
        visible={isSettingsModalVisible}
        onClose={() => {
          setIsSettingsModalVisible(false);
          setEditingAssistant(null);
        }}
        onUpdate={updateAssistant}
        datasets={datasets}
      />
    </div>
  );
};

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
    color: '#64748b',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transition: 'all 0.3s ease',
  },

  sidebar: {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    width: '25vw',
    background: '#fff',
    borderRight: '1px solid #e2e8f0',
    transition: 'transform 0.3s ease',
    zIndex: 1000,
    overflow: 'auto',
    padding: '20px',
  },

  rightSidebar: {
    position: 'fixed',
    right: 0,
    top: 0,
    bottom: 0,
    width: '25vw',
    background: '#fff',
    borderLeft: '1px solid #e2e8f0',
    transition: 'transform 0.3s ease',
    zIndex: 1000,
    overflow: 'auto',
    padding: '20px',
  },

  mainArea: {
    flex: 1,
    height: '100vh',
    transition: 'all 0.3s ease',
    background: '#fff',
    overflow: 'hidden',
    position: 'relative',
    marginLeft: '0px',
    marginRight: '0px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  },

  chatContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },

  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    paddingBottom: '100px',
  },

  messageWrapper: {
    marginBottom: '10px',
    maxWidth: '70%',
  },

  message: {
    display: 'inline-block',
    padding: '8px 12px',
    borderRadius: '8px',
    maxWidth: '100%',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
  },

  userMessage: {
    background: '#1890ff',
    color: 'white',
  },

  assistantMessage: {
    background: '#f0f0f0',
    color: 'black',
  },

  inputContainer: {
    display: 'flex',
    gap: '10px',
    padding: '20px',
    background: '#fff',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTop: '1px solid #e2e8f0',
    zIndex: 1000,
    boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',
  },

  noChat: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#64748b',
  },

  // Mobile styles
  mobileContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
  },

  tabBar: {
    display: 'flex',
    padding: '10px',
    gap: '10px',
    borderBottom: '1px solid #e2e8f0',
    background: '#fff',
    zIndex: 1000,
  },

  mobileContent: {
    flex: 1,
    overflow: 'auto',
    position: 'relative',
  },

  knowledgeBase: {
    padding: '20px',
  },

  datasetItem: {
    cursor: 'pointer',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    marginBottom: '12px',
    transition: 'all 0.3s ease',
    background: '#fff',
  },

  datasetName: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#1a202c',
    marginBottom: '4px',
  },

  datasetCount: {
    fontSize: '14px',
    color: '#64748b',
  },

  uploadSection: {
    marginTop: '24px',
  },

  uploadButton: {
    width: '100%',
    height: '40px',
    border: '1px dashed #d1d5db',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    background: '#f8fafc',
    marginTop: '8px',
  },

  uploadButtonHover: {
    borderColor: '#1890ff',
    background: '#f0f7ff',
  },

  uploadText: {
    color: '#64748b',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  citationContainer: {
    marginTop: '8px',
    display: 'flex',
    alignItems: 'center',
  },

  citationLabel: {
    fontWeight: 600,
    color: '#4f46e5',
    marginRight: '8px',
  },

  loadingMessage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },

  loadingDots: {
    display: 'flex',
    gap: '4px',
  },
};

export default ChatPage; 