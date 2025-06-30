import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Form, Upload, message, Card, Space, Divider } from 'antd';
import { UploadOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import CreateDataset from '../components/CreateDataset';

interface Dataset {
  id: string;
  name: string;
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

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const PlaygroundPage: React.FC = () => {
  const navigate = useNavigate();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [chatAssistant, setChatAssistant] = useState<any>(null);
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [parseSuccess, setParseSuccess] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const currentMessageRef = useRef<string>('');

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files);
    setUploadSuccess(null);
  };

  const parseDocuments = async (documentIds: string[]) => {
    if (!settings || !dataset || documentIds.length === 0) {
      return;
    }

    try {
      setParsing(true);
      const response = await fetch(`${settings.apiUrl}/api/v1/datasets/${dataset.id}/chunks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          document_ids: documentIds,
          chunk_method: 'naive',
          parser_config: {
            chunk_token_num: 128,
            delimiter: '\n',
            auto_keywords: 0,
            auto_questions: 0,
            html4excel: false,
            layout_recognize: 'DeepDOC',
            task_page_size: 12,
            raptor: { use_raptor: false },
            graphrag: { use_graphrag: false }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Parse failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.code === 0) {
        setParseSuccess(`Successfully parsed ${documentIds.length} files`);
        message.success('Files parsed successfully!');
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
    if (!settings) {
      message.error('Please configure settings first');
      return;
    }

    if (!dataset) {
      message.error('Please create a dataset first');
      return;
    }

    if (!selectedFiles || selectedFiles.length === 0) {
      message.error('Please select files to upload');
      return;
    }

    try {
      setUploading(true);
      setUploadSuccess(null);
      setParseSuccess(null);

      const formData = new FormData();
      Array.from(selectedFiles).forEach(file => {
        formData.append('file', file);
      });

      const response = await fetch(`${settings.apiUrl}/api/v1/datasets/${dataset.id}/documents`, {
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
        setUploadSuccess(`Successfully uploaded ${selectedFiles.length} files`);
        message.success('Files uploaded successfully!');
        
        // Parse the uploaded documents
        if (uploadData.data && Array.isArray(uploadData.data)) {
          const documentIds = uploadData.data.map((doc: any) => doc.id);
          await parseDocuments(documentIds);
        }
      } else {
        throw new Error(`Upload API error: ${uploadData.message || 'Unknown error'}`);
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setSelectedFiles(null);
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    }
  };

  const createChatAssistant = async () => {
    if (!settings) {
      message.error('Please configure settings first');
      return;
    }

    if (!dataset) {
      message.error('Please create a dataset first');
      return;
    }

    try {
      const response = await fetch(`${settings.apiUrl}/api/v1/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          name: dataset.name,
          dataset_ids: [dataset.id],
          prompt:{
            similarity_threshold: 0.01,
            prompt: "You are a helpful assistant. reply with relevant information from the context.{knowledge}",
            variables: [{"key": "knowledge", "optional": true}]
          }
        })
      });

      const data = await response.json();
      if (data.code === 0) {
        setChatAssistant(data.data);
        message.success('Chat assistant created successfully!');
      } else {
        message.error(data.message);
      }
    } catch (error) {
      message.error('Failed to create chat assistant');
    }
  };

  const createChatSession = async () => {
    if (!settings) {
      message.error('Please configure settings first');
      return;
    }

    if (!chatAssistant) {
      message.error('Please create chat assistant first');
      return;
    }

    try {
      const response = await fetch(`${settings.apiUrl}/api/v1/chats/${chatAssistant.id}/sessions`, {
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
        message.success('Chat session created successfully!');
      } else {
        message.error(data.message);
      }
    } catch (error) {
      message.error('Failed to create chat session');
    }
  };

  const sendMessage = async () => {
    if (!settings || !chatAssistant || !chatSession || !inputMessage.trim()) return;

    const newMessage = { role: 'user' as const, content: inputMessage };
    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsStreaming(true);
    currentMessageRef.current = '';

    try {
      const response = await fetch(`${settings.apiUrl}/api/v1/chats/${chatAssistant.id}/completions`, {
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
                // Final message
                setMessages(prev => [
                  ...prev.slice(0, -1),
                  { role: 'assistant', content: currentMessageRef.current }
                ]);
                break;
              } else if (typeof data.data?.content === 'string') {
                // Streaming content
                currentMessageRef.current += data.data.content;
                setMessages(prev => [
                  ...prev.slice(0, -1),
                  { role: 'assistant', content: currentMessageRef.current }
                ]);
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
    } finally {
      setIsStreaming(false);
      currentMessageRef.current = '';
    }
  };

  const goToChatPage = () => {
    navigate('/chat');
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

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ textAlign: 'right' }}>
          <Button type="link" onClick={goToChatPage}>
            Skip to Chat Page <ArrowRightOutlined />
          </Button>
        </div>

        <CreateDataset 
          settings={settings}
          onDatasetCreated={setDataset}
        />

        {dataset && (
          <Card title="Upload Files">
            <div style={{ marginBottom: '16px' }}>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                style={{ marginBottom: '16px' }}
              />
              {selectedFiles && selectedFiles.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <p>Selected files:</p>
                  <ul>
                    {Array.from(selectedFiles).map((file, index) => (
                      <li key={index}>{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Button
                type="primary"
                onClick={handleUpload}
                loading={uploading || parsing}
                disabled={!selectedFiles || selectedFiles.length === 0}
              >
                {uploading ? 'Uploading...' : parsing ? 'Parsing...' : 'Upload and Parse'}
              </Button>
            </div>
            {uploadSuccess && (
              <div style={{ color: '#52c41a', marginBottom: '8px' }}>
                {uploadSuccess}
              </div>
            )}
            {parseSuccess && (
              <div style={{ color: '#52c41a', marginBottom: '8px' }}>
                {parseSuccess}
              </div>
            )}
          </Card>
        )}

        {dataset && (
          <Card title="Create Chat Assistant">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Button type="primary" onClick={createChatAssistant}>
                Create Chat Assistant
              </Button>
            </Space>
          </Card>
        )}

        {chatAssistant && (
          <Card title="Create Chat Session">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Button type="primary" onClick={createChatSession}>
                Create Chat Session
              </Button>
              <Divider>or</Divider>
              <Button type="primary" onClick={goToChatPage}>
                Go to Chat Page <ArrowRightOutlined />
              </Button>
            </Space>
          </Card>
        )}

        {chatSession && (
          <>
            <Card title="Chat Interface">
              <div style={{ height: '300px', overflowY: 'auto', marginBottom: '20px', border: '1px solid #d9d9d9', padding: '10px' }}>
                {messages.map((msg, index) => (
                  <div key={index} style={{ marginBottom: '10px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                    <div
                      style={{
                        background: msg.role === 'user' ? '#1890ff' : '#f0f0f0',
                        color: msg.role === 'user' ? 'white' : 'black',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        display: 'inline-block',
                        maxWidth: '70%',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Input
                  value={inputMessage}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)}
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
            </Card>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <Button type="primary" size="large" onClick={goToChatPage}>
                Continue in Chat Page <ArrowRightOutlined />
              </Button>
            </div>
          </>
        )}
      </Space>
    </div>
  );
};

export default PlaygroundPage; 