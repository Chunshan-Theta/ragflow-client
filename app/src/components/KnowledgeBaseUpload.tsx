import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface Dataset {
  id: string
  name: string
  description?: string | null
  create_time: number
  update_time: number
  create_date: string
  update_date: string
  document_count: number
  chunk_count: number
  language: string
  status: string
  embedding_model: string
  token_num: number
}

interface ApiResponse {
  code: number
  data: Dataset[]
}

interface Settings {
  apiUrl: string
  agentId: string
  apiKey: string
}

const KnowledgeBaseUpload: React.FC = () => {
  const navigate = useNavigate()
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('')
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseSuccess, setParseSuccess] = useState<string | null>(null)

  // 從 localStorage 載入設定
  useEffect(() => {
    const savedSettings = localStorage.getItem('chatSettings')
    if (savedSettings) {
      try {
        const parsedSettings: Settings = JSON.parse(savedSettings)
        setSettings(parsedSettings)
      } catch (error) {
        setError('無法載入設定，請先到設定頁面配置')
      }
    } else {
      setError('未找到 API 設定，請先到設定頁面配置')
    }
  }, [])

  // 獲取知識庫列表
  const fetchDatasets = async () => {
    if (!settings) {
      setError('請先配置 API 設定')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null) // 清除之前的錯誤
      
      const response = await fetch(`${settings.apiUrl}/api/v1/datasets`, {
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch datasets: ${response.statusText}`)
      }
      
      const data: ApiResponse = await response.json()
      console.log('API Response:', data) // 調試用
      
      // 處理 API 響應格式 { code: 0, data: [...] }
      let datasetsArray: Dataset[] = []
      
      if (data.code === 0 && Array.isArray(data.data)) {
        datasetsArray = data.data
      } else {
        console.warn('API 回傳格式異常或錯誤碼非 0:', data)
        setError(`API 錯誤: ${data.code || 'Unknown error'}`)
      }
      
      console.log('Parsed datasets:', datasetsArray) // 調試用
      setDatasets(datasetsArray)
      
    } catch (err) {
      console.error('Fetch datasets error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load datasets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (settings) {
      fetchDatasets()
    }
  }, [settings])

  // 處理文件選擇
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files)
    setUploadSuccess(null)
    setError(null)
  }

  // 文件解析函數
  const parseDocuments = async (documentIds: string[]) => {
    if (!settings || !selectedDatasetId || documentIds.length === 0) {
      return
    }

    try {
      setParsing(true)
      setError(null)

      const response = await fetch(`${settings.apiUrl}/api/v1/datasets/${selectedDatasetId}/chunks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          document_ids: documentIds
        })
      })

      if (!response.ok) {
        throw new Error(`Parse failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.code === 0) {
        setParseSuccess(`成功解析 ${documentIds.length} 個文件`)
      } else {
        throw new Error(`Parse API error: ${data.message || 'Unknown error'}`)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parse failed')
    } finally {
      setParsing(false)
    }
  }

  // 上傳文件
  const handleUpload = async () => {
    if (!settings) {
      setError('請先配置 API 設定')
      return
    }

    if (!selectedDatasetId) {
      setError('請選擇一個知識庫')
      return
    }

    if (!selectedFiles || selectedFiles.length === 0) {
      setError('請選擇要上傳的文件')
      return
    }

    try {
      setUploading(true)
      setError(null)
      setUploadSuccess(null)
      setParseSuccess(null)

      const formData = new FormData()
      
      // 添加所有選中的文件
      Array.from(selectedFiles).forEach(file => {
        formData.append('file', file)
      })

      const response = await fetch(`${settings.apiUrl}/api/v1/datasets/${selectedDatasetId}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const uploadData = await response.json()
      
      if (uploadData.code === 0) {
        setUploadSuccess(`成功上傳 ${selectedFiles.length} 個文件到知識庫`)
        
        // 檢查回應中是否有 document_ids
        let documentIds: string[] = []
        
        if (uploadData.data) {
          if (Array.isArray(uploadData.data)) {
            // 如果 data 是陣列，每個元素可能有 id 屬性
            documentIds = uploadData.data.map((doc: any) => doc.id).filter(Boolean)
          } else if (uploadData.data.document_ids && Array.isArray(uploadData.data.document_ids)) {
            // 如果有專門的 document_ids 欄位
            documentIds = uploadData.data.document_ids
          } else if (uploadData.data.id) {
            // 如果只有一個文件的 id
            documentIds = [uploadData.data.id]
          }
        }

        // 如果有獲得 document IDs，開始解析
        if (documentIds.length > 0) {
          await parseDocuments(documentIds)
        } else {
          setError('上傳成功但無法獲得文件 ID，可能需要手動解析')
        }
        
        // 清空選擇
        setSelectedFiles(null)
        const fileInput = document.getElementById('fileInput') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        throw new Error(`Upload API error: ${uploadData.message || 'Unknown error'}`)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>知識庫文件上傳</h1>
          <button 
            onClick={() => navigate('/')}
            style={styles.backButton}
          >
            返回首頁
          </button>
        </div>
        
        {/* 知識庫選擇 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>選擇知識庫</h2>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <span style={styles.loadingText}>載入知識庫列表...</span>
            </div>
          ) : (
            <div style={styles.datasetGrid}>
              {datasets.map((dataset) => (
                <div
                  key={dataset.id}
                  style={{
                    ...styles.datasetCard,
                    ...(selectedDatasetId === dataset.id ? styles.selectedDataset : {})
                  }}
                  onClick={() => setSelectedDatasetId(dataset.id)}
                >
                  <h3 style={styles.datasetTitle}>{dataset.name}</h3>
                  {dataset.description && (
                    <p style={styles.datasetDescription}>{dataset.description}</p>
                  )}
                  <div style={styles.datasetInfo}>
                    <div style={styles.infoRow}>
                      <span>📄 文件數量: {dataset.document_count}</span>
                      <span>🔗 分塊數量: {dataset.chunk_count}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <span>🌐 語言: {dataset.language}</span>
                      <span>✅ 狀態: {dataset.status === '1' ? '啟用' : '停用'}</span>
                    </div>
                    <div style={styles.dateInfo}>
                      建立時間: {new Date(dataset.create_time).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
              {datasets.length === 0 && !loading && (
                <div style={styles.emptyState}>
                  <p>沒有找到知識庫，請先建立一個知識庫</p>
                  <p style={styles.emptyStateSubtext}>
                    已載入的知識庫數量: {datasets.length}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 文件上傳 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>上傳文件</h2>
          <div style={styles.uploadArea}>
            <input
              id="fileInput"
              type="file"
              multiple
              onChange={handleFileChange}
              style={styles.fileInput}
              accept=".txt,.pdf,.doc,.docx,.md"
            />
            <p style={styles.uploadText}>
              支援格式: TXT, PDF, DOC, DOCX, MD
            </p>
          </div>
          
          {selectedFiles && (
            <div style={styles.fileList}>
              <h3 style={styles.fileListTitle}>選中的文件:</h3>
              <ul style={styles.fileItems}>
                {Array.from(selectedFiles).map((file, index) => (
                  <li key={index} style={styles.fileItem}>
                    <span>{file.name}</span>
                    <span style={styles.fileSize}>({(file.size / 1024).toFixed(1)} KB)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 上傳按鈕 */}
        <div style={styles.buttonContainer}>
          <button
            onClick={handleUpload}
            disabled={uploading || parsing || !selectedDatasetId || !selectedFiles}
            style={{
              ...styles.uploadButton,
              ...(uploading || parsing || !selectedDatasetId || !selectedFiles ? styles.disabledButton : {})
            }}
          >
            {uploading ? '上傳中...' : parsing ? '解析中...' : '上傳並解析文件'}
          </button>
        </div>

        {/* 狀態訊息 */}
        {error && (
          <div style={styles.errorMessage}>
            <div>{error}</div>
            {!settings && (
              <button 
                onClick={() => navigate('/settings')}
                style={styles.settingsButton}
              >
                前往設定頁面
              </button>
            )}
          </div>
        )}
        
        {uploadSuccess && (
          <div style={styles.successMessage}>
            {uploadSuccess}
          </div>
        )}

        {parseSuccess && (
          <div style={styles.parseSuccessMessage}>
            {parseSuccess}
          </div>
        )}

        {parsing && (
          <div style={styles.parsingMessage}>
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <span style={styles.loadingText}>正在解析文件...</span>
            </div>
          </div>
        )}

        {/* 重新載入按鈕 */}
        <div style={styles.reloadContainer}>
          <button
            onClick={fetchDatasets}
            style={styles.reloadButton}
          >
            重新載入知識庫列表
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    color: '#fff'
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px',
    flexWrap: 'wrap' as const,
    gap: '16px'
  },
  title: {
    fontSize: '36px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: 0,
    flex: '1'
  },
  backButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    padding: '12px 24px',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)'
  },
  section: {
    marginBottom: '40px'
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 600,
    marginBottom: '24px',
    color: '#e2e8f0'
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '120px'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(255, 255, 255, 0.3)',
    borderTop: '3px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginLeft: '16px',
    color: '#a0aec0'
  },
  datasetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    maxWidth: '800px'
  },
  datasetCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    position: 'relative' as const
  },
  selectedDataset: {
    border: '2px solid #667eea',
    background: 'rgba(102, 126, 234, 0.2)'
  },
  datasetTitle: {
    fontSize: '18px',
    fontWeight: 600,
    margin: '0 0 8px 0',
    color: '#fff'
  },
  datasetDescription: {
    fontSize: '14px',
    color: '#a0aec0',
    margin: '0 0 16px 0'
  },
  datasetInfo: {
    fontSize: '13px',
    color: '#a0aec0',
    marginTop: '12px'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  dateInfo: {
    fontSize: '11px',
    color: '#718096',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '48px',
    color: '#a0aec0'
  },
  emptyStateSubtext: {
    fontSize: '12px',
    marginTop: '8px',
    color: '#718096'
  },
  uploadArea: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '2px dashed rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    padding: '32px 24px',
    textAlign: 'center' as const,
    transition: 'all 0.3s ease',
    maxWidth: '600px'
  },
  fileInput: {
    width: '75%',
    padding: '16px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px'
  },
  uploadText: {
    marginTop: '16px',
    fontSize: '14px',
    color: '#a0aec0'
  },
  fileList: {
    marginTop: '24px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '16px'
  },
  fileListTitle: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '12px',
    color: '#e2e8f0'
  },
  fileItems: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  fileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    fontSize: '14px',
    color: '#a0aec0'
  },
  fileSize: {
    color: '#718096'
  },
  buttonContainer: {
    marginBottom: '32px'
  },
  uploadButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '12px',
    padding: '16px 32px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  disabledButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#718096',
    cursor: 'not-allowed'
  },
  errorMessage: {
    background: 'rgba(245, 101, 101, 0.1)',
    border: '1px solid rgba(245, 101, 101, 0.3)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    color: '#fed7d7'
  },
  successMessage: {
    background: 'rgba(72, 187, 120, 0.1)',
    border: '1px solid rgba(72, 187, 120, 0.3)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    color: '#c6f6d5'
  },
  settingsButton: {
    marginTop: '12px',
    background: '#e53e3e',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px'
  },
  reloadContainer: {
    textAlign: 'center'
  },
  reloadButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    padding: '12px 24px',
    color: '#a0aec0',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  parseSuccessMessage: {
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    color: '#bbf7d0'
  },
  parsingMessage: {
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    color: '#bfdbfe'
  }
}

export default KnowledgeBaseUpload 