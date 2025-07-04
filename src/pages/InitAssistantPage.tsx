import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Form, Upload, message, Card, Space, Divider, List, Typography } from 'antd';
import { UploadOutlined, ArrowRightOutlined, ForwardOutlined, WarningOutlined } from '@ant-design/icons';
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
  type?: 'error' | 'success';
}

const InitAssistantPage: React.FC = () => {
  const navigate = useNavigate();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '歡迎！讓我幫您設置ai教學助教。'
    },
    {
      role: 'assistant',
      content: '首先，請先給予一個該助教一個名字。'
    }
  ]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [parseSuccess, setParseSuccess] = useState<string | null>(null);

  // Add function to update messages
  const addMessage = (role: 'user' | 'assistant', content: string, type?: 'error' | 'success') => {
    setMessages(prevMessages => [...prevMessages, { role, content, type }]);
  };

  useEffect(() => {
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } catch (error) {
        addMessage('assistant', '載入設置失敗。請先進行設置配置。', 'error');
      }
    } else {
      addMessage('assistant', '未找到設置。請先進行設置配置。', 'error');
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
      const response = await fetch(`${settings.apiUrl}/api/v1/datasets/${dataset.id}/chunks`, {
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
        setParseSuccess(`Successfully parsed ${documentIds.length} files`);
        message.success('Files parsed successfully!');
      } else {
        throw new Error(`Parse API error: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      addMessage('assistant', err instanceof Error ? err.message : 'Parse failed', 'error');
    }
  };

  const handleUpload = async () => {
    if (!settings) {
      addMessage('assistant', '請先進行設置配置', 'error');
      return;
    }

    if (!dataset) {
      addMessage('assistant', '請先創建數據集', 'error');
      return;
    }

    if (!selectedFiles || selectedFiles.length === 0) {
      addMessage('assistant', '請選擇要上傳的文件', 'error');
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
        throw new Error(`上傳失敗：${response.statusText}`);
      }

      const uploadData = await response.json();
      
      if (uploadData.code === 0) {
        setUploadSuccess(`成功上傳 ${selectedFiles.length} 個文件`);
        message.success('文件上傳成功！');
        addMessage('assistant', `太好了！我已經成功上傳了 ${selectedFiles.length} 個文件到您的數據集。`, 'success');
        addMessage('assistant', `請點選繼續開始使用這名ai教學助教`, 'success');
        
        // Parse the uploaded documents
        if (uploadData.data && Array.isArray(uploadData.data)) {
          const documentIds = uploadData.data.map((doc: any) => doc.id);
          await parseDocuments(documentIds);
        }
      } else {
        throw new Error(`上傳 API 錯誤：${uploadData.message || '未知錯誤'}`);
      }
    } catch (err) {
      addMessage('assistant', err instanceof Error ? err.message : '上傳失敗', 'error');
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
      addMessage('assistant', '請先進行設置配置', 'error');
      return;
    }

    if (!dataset) {
      addMessage('assistant', '請先創建數據集', 'error');
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
            empty_response: "",
            similarity_threshold: 0.01,
            prompt: "您是親和又專業的助教，請根據參考資料回答學生問題。以下是參考資料：{knowledge}",
            temperature: 0.7,
            max_tokens: 1024,
            top_p: 0.95,
            frequency_penalty: 0,
            presence_penalty: 0,
            keywords_similarity_weight: 0.05,
            variables: [
              {
                key: "knowledge",
                optional: true
              }
            ]
          }
        })
      });

      if (!response.ok) {
        throw new Error(`創建聊天助手失敗：${response.statusText}`);
      }

      const data = await response.json();
      if (data.code === 0) {
        message.success('聊天助手創建成功！');
        addMessage('assistant', '太好了！您的聊天助手已成功創建。現在可以開始聊天了！', 'success');
        navigate('/chat')
      } else {
        if (data.message.includes("doesn't own parsed file")){
          addMessage('assistant','目前上傳資料還在處理中，請等待幾分鐘後再試', 'success');

        }
        else{
          throw new Error(`API 錯誤：${data.message || '未知錯誤'}`);
        }
      }
    } catch (err) {
      addMessage('assistant', err instanceof Error ? err.message : '創建聊天助手失敗', 'error');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card title="Initialize Chat Assistant" className="mb-8">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button 
            type="link" 
            icon={<ForwardOutlined />} 
            onClick={() => navigate('/chat')}
            style={{ marginBottom: '16px' }}
          >
            Skip to Chat
          </Button>

          {/* Add message display section */}
          {messages.length > 0 && (
            <>
              <Divider />
              <List
                itemLayout="horizontal"
                dataSource={messages}
                renderItem={(msg) => (
                  <List.Item
                    style={{
                      backgroundColor: msg.type === 'error' ? '#fff2f0' : 
                                     msg.role === 'assistant' ? '#e6f7ff' : '#f0f2f5',
                      padding: '12px',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        msg.type === 'error' ? 
                          <WarningOutlined style={{ color: '#ff4d4f', fontSize: '20px' }} /> :
                          msg.role === 'assistant' ? 
                            <img src="/logo192.png" alt="Assistant" style={{ width: '24px', height: '24px', borderRadius: '50%' }} /> :
                            <div style={{ 
                              width: '24px', 
                              height: '24px', 
                              borderRadius: '50%', 
                              backgroundColor: '#1890ff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '12px'
                            }}>
                              You
                            </div>
                      }
                      title={
                        <Typography.Text style={{ 
                          color: msg.type === 'error' ? '#ff4d4f' : 
                                msg.role === 'assistant' ? '#1890ff' : '#000000',
                          fontWeight: msg.type === 'error' ? 'bold' : '500',
                          fontSize: '16px'
                        }}>
                          {msg.role === 'user' ? 'You' : 'Assistant'}
                        </Typography.Text>
                      }
                      description={
                        <Typography.Text style={{ 
                          color: msg.type === 'error' ? '#ff4d4f' : 
                                msg.role === 'assistant' ? '#262626' : '#262626',
                          fontSize: '14px',
                          lineHeight: '1.5'
                        }}>
                          {msg.content}
                        </Typography.Text>
                      }
                    />
                  </List.Item>
                )}
              />
            </>
          )}

          {!dataset && <CreateDataset
            settings={{
              apiUrl: settings?.apiUrl || '',
              apiKey: settings?.apiKey || '',
              agentId: settings?.agentId || ''
            }}
            onDatasetCreated={(dataset) => {
              setDataset(dataset);
              addMessage('assistant', `太好了！我已經成功創建了ai教學助教。現在可以開始上傳資料到知識庫了！`, 'success');
              addMessage('assistant', `知識庫的內容會提供給ai教學助教使用，請上傳相關的資料！`, 'success');
            }}
          />}
          
          {dataset && !uploadSuccess&& (
            <>
              <Divider />
              <div>
                <h3 className="mb-4">上傳資料到知識庫</h3>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    style={{ marginBottom: '16px' }}
                  />
                  <Button
                    onClick={handleUpload}
                    loading={uploading}
                    icon={<UploadOutlined />}
                    type="primary"
                  >
                    Upload and Parse
                  </Button>
                  {uploadSuccess && <div className="text-green-600">{uploadSuccess}</div>}
                  {parseSuccess && <div className="text-green-600">{parseSuccess}</div>}
                </Space>
              </div>
            </>
          )}
          
          {dataset && uploadSuccess && parseSuccess && (
            <>
              <Divider />
              <div>
                <Button
                  type="primary"
                  onClick={createChatAssistant}
                  icon={<ArrowRightOutlined />}
                >
                  Create Chat Assistant and Continue
                </Button>
              </div>
            </>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default InitAssistantPage; 