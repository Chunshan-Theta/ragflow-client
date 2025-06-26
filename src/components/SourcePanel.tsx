import React, { useState, useEffect } from 'react'

interface Document {
  id: string
  name: string
  type: string
  uploadDate: string
  status: 'uploaded' | 'processing' | 'ready'
}

interface Dataset {
  id: string
  name: string
  description?: string | null
  document_count: number
  documents?: Document[]
}

interface Settings {
  apiUrl: string
  agentId: string
  apiKey: string
}

const SourcePanel: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [selectedDatasets, setSelectedDatasets] = useState<Set<string>>(new Set())
  const [isUploading, setIsUploading] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[] | null>(null)
  const [targetDatasetId, setTargetDatasetId] = useState<string>('')

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

  useEffect(() => {
    if (settings) {
      fetchDatasets()
    }
  }, [settings])

  const fetchDatasets = async () => {
    if (!settings) return

    try {
      const response = await fetch(`${settings.apiUrl}/api/v1/datasets`, {
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`
        }
      })
      
      const data = await response.json()
      if (data.code === 0 && Array.isArray(data.data)) {
        setDatasets(data.data)
        // 默认选中所有数据集
        const allIds = new Set<string>(data.data.map((dataset: Dataset) => dataset.id))
        setSelectedDatasets(allIds)
      }
    } catch (error) {
      console.error('Failed to fetch datasets:', error)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    console.log('選擇的文件:', files)
    console.log('文件數量:', files ? files.length : 0)
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    setSelectedFiles(fileArray)
    setShowUploadModal(true)
    console.log('设置selectedFiles:', fileArray.length, '个文件')
    // 重置文件输入框
    event.target.value = ''
  }

  const handleUploadConfirm = async () => {
    if (!selectedFiles || !targetDatasetId || !settings) return

    console.log('开始上传，文件数量:', selectedFiles.length)
    console.log('文件列表:', Array.from(selectedFiles).map(f => f.name))
    setIsUploading(true)
    
    try {
      const formData = new FormData()
      selectedFiles.forEach(file => {
        formData.append('file', file)
      })

      const response = await fetch(`${settings.apiUrl}/api/v1/datasets/${targetDatasetId}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: formData
      })

      if (response.ok) {
        const uploadResult = await response.json()
        const fileCount = selectedFiles.length
        console.log('上传成功，文件数量:', fileCount)
        console.log('上传响应:', uploadResult)
        
        // 提取文档ID用于解析
        let documentIds: string[] = []
        if (uploadResult.data && Array.isArray(uploadResult.data)) {
          documentIds = uploadResult.data.map((doc: any) => doc.id)
        } else if (uploadResult.document_ids && Array.isArray(uploadResult.document_ids)) {
          documentIds = uploadResult.document_ids
        }
        
        // 自动驱动文档解析
        if (documentIds.length > 0) {
          console.log('开始解析文档，文档IDs:', documentIds)
          try {
            const parseResponse = await fetch(`${settings.apiUrl}/api/v1/datasets/${targetDatasetId}/chunks`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
              },
              body: JSON.stringify({
                document_ids: documentIds
              })
            })
            
            if (parseResponse.ok) {
              console.log('文档解析已触发')
            } else {
              console.error('文档解析失败:', parseResponse.status)
            }
          } catch (parseError) {
            console.error('文档解析请求失败:', parseError)
          }
        }
        
        fetchDatasets() // 刷新数据集列表
        setShowUploadModal(false)
        setSelectedFiles(null)
        setTargetDatasetId('')
        alert(`成功上傳 ${fileCount} 個文件，需要等待解析完成才能使用。`)
      } else {
        const errorText = await response.text()
        console.error('Upload failed:', response.status, errorText)
        throw new Error(`Upload failed: ${response.status}`)
      }
    } catch (error) {
      console.error('Upload failed:', error)
      alert('上传失败，请重试')
    } finally {
      setIsUploading(false)
    }
  }

  const handleUploadCancel = () => {
    setShowUploadModal(false)
    setSelectedFiles(null)
    setTargetDatasetId('')
  }

  const toggleDatasetSelection = (datasetId: string) => {
    const newSelected = new Set(selectedDatasets)
    if (newSelected.has(datasetId)) {
      newSelected.delete(datasetId)
    } else {
      newSelected.add(datasetId)
    }
    setSelectedDatasets(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedDatasets.size === datasets.length) {
      // 如果全选，则取消全选
      setSelectedDatasets(new Set())
    } else {
      // 否则全选
      const allIds = new Set<string>(datasets.map(dataset => dataset.id))
      setSelectedDatasets(allIds)
    }
  }

  return (
    <div style={styles.panel}>
      {/* 头部 */}
      <div style={styles.header}>
        <h2 style={styles.title}>來源</h2>
        <div style={styles.actions}>
          <label style={styles.addButton}>
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              style={styles.hiddenInput}
              accept=".pdf,.doc,.docx,.txt,.md"
            />
            <span style={styles.addIcon}>+</span> 新增
          </label>
        </div>
      </div>

      {/* 数据集选择 */}


      {/* 文档列表 */}
      <div style={styles.documentList}>
        {datasets.map((dataset) => (
          <div 
            key={dataset.id}
            style={styles.datasetItem}
            onClick={() => toggleDatasetSelection(dataset.id)}
          >
            <div style={styles.datasetIcon}>📄</div>
            <div style={styles.datasetInfo}>
              <div style={styles.datasetName}>{dataset.name}</div>
              <div style={styles.datasetMeta}>
                {dataset.document_count} 個參考資料
              </div>
              {dataset.description && (
                <div style={styles.datasetDescription}>
                  {dataset.description}
                </div>
              )}
            </div>
            
          </div>
        ))}
      </div>

      {/* 上传状态 */}
      {isUploading && (
        <div style={styles.uploadStatus}>
          <div style={styles.spinner}></div>
          <span>上传中...</span>
        </div>
      )}

      {/* 空状态 */}
      {datasets.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📁</div>
          <div style={styles.emptyText}>尚未上传任何來源</div>
          <div style={styles.emptySubtext}>上传文档开始使用</div>
        </div>
      )}

      {/* 上传模态窗口 */}
      {showUploadModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>選擇知識庫</h3>
            <p style={styles.modalDescription}>
              選擇要上傳參考資料的知識庫：
            </p>
            
            {/* 知识库选择 */}
            <div style={styles.datasetSelect}>
              {datasets.map((dataset) => (
                <div
                  key={dataset.id}
                  style={{
                    ...styles.datasetOption,
                    ...(targetDatasetId === dataset.id ? styles.selectedOption : {})
                  }}
                  onClick={() => setTargetDatasetId(dataset.id)}
                >
                  <div style={styles.optionIcon}>📄</div>
                  <div style={styles.optionInfo}>
                    <div style={styles.optionName}>{dataset.name}</div>
                    <div style={styles.optionMeta}>
                      {dataset.document_count} 個參考資料
                    </div>
                  </div>
                  <div style={styles.radioButton}>
                    <input
                      type="radio"
                      checked={targetDatasetId === dataset.id}
                      onChange={() => setTargetDatasetId(dataset.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            {/* 文件信息 */}
            {selectedFiles && (
              <div style={styles.fileInfo}>
                <p style={styles.fileInfoText}>
                  將上傳 {selectedFiles.length} 個文件：
                </p>
                <div style={styles.fileList}>
                  {selectedFiles.map((file, index) => (
                    <div key={index} style={styles.fileItem}>
                      <span style={styles.fileName}>{file.name}</span>
                      <span style={styles.fileSize}>
                        ({Math.round(file.size / 1024)} KB)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 按钮 */}
            <div style={styles.modalButtons}>
              <button
                style={styles.cancelButton}
                onClick={handleUploadCancel}
              >
                取消
              </button>
              <button
                style={{
                  ...styles.confirmButton,
                  ...((!targetDatasetId || isUploading) ? styles.disabledButton : {})
                }}
                onClick={handleUploadConfirm}
                disabled={!targetDatasetId || isUploading}
              >
                {isUploading ? '上传中...' : '确认上传'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  panel: {
    background: '#2a2d31',
    color: '#ffffff',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #3a3d41',
  },

  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #3a3d41',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    fontSize: '16px',
    fontWeight: 600,
    margin: 0,
    color: '#ffffff',
  },

  actions: {
    display: 'flex',
    gap: '8px',
  },

  addButton: {
    background: '#1a73e8',
    border: 'none',
    borderRadius: '20px',
    padding: '8px 12px',
    color: '#ffffff',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },

  searchButton: {
    background: 'transparent',
    border: '1px solid #3a3d41',
    borderRadius: '20px',
    padding: '8px 12px',
    color: '#ffffff',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },

  addIcon: {
    fontSize: '14px',
  },

  searchIcon: {
    fontSize: '12px',
  },

  hiddenInput: {
    display: 'none',
  },

  datasetSection: {
    padding: '12px 20px',
    borderBottom: '1px solid #3a3d41',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionTitle: {
    fontSize: '13px',
    color: '#9aa0a6',
  },

  checkbox: {
    color: '#1a73e8',
  },

  documentList: {
    flex: 1,
    overflow: 'auto',
    padding: '8px 0',
  },

  datasetItem: {
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid #3a3d41',
    cursor: 'pointer',
  },

  datasetIcon: {
    fontSize: '16px',
    width: '20px',
    textAlign: 'center',
  },

  datasetInfo: {
    flex: 1,
  },

  datasetName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#ffffff',
    marginBottom: '2px',
  },

  datasetMeta: {
    fontSize: '12px',
    color: '#9aa0a6',
  },

  datasetDescription: {
    fontSize: '11px',
    color: '#9aa0a6',
    marginTop: '4px',
    lineHeight: 1.3,
    opacity: 0.8,
  },

  uploadStatus: {
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderTop: '1px solid #3a3d41',
    color: '#9aa0a6',
    fontSize: '12px',
  },

  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #3a3d41',
    borderTop: '2px solid #1a73e8',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },

  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9aa0a6',
    textAlign: 'center',
    padding: '40px 20px',
  },

  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.5,
  },

  emptyText: {
    fontSize: '14px',
    marginBottom: '4px',
  },

  emptySubtext: {
    fontSize: '12px',
    opacity: 0.7,
  },

  // 模态窗口样式
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },

  modalContent: {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    minWidth: '400px',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
  },

  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#202124',
    margin: '0 0 8px 0',
  },

  modalDescription: {
    fontSize: '14px',
    color: '#5f6368',
    margin: '0 0 20px 0',
  },

  datasetSelect: {
    marginBottom: '20px',
  },

  datasetOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    border: '1px solid #e8eaed',
    borderRadius: '8px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  selectedOption: {
    borderColor: '#1a73e8',
    backgroundColor: '#e8f0fe',
  },

  optionIcon: {
    fontSize: '16px',
    width: '20px',
    textAlign: 'center',
  },

  optionInfo: {
    flex: 1,
  },

  optionName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#202124',
    marginBottom: '2px',
  },

  optionMeta: {
    fontSize: '12px',
    color: '#5f6368',
  },

  radioButton: {
    color: '#1a73e8',
  },

  fileInfo: {
    marginBottom: '20px',
    padding: '16px',
    background: '#f8f9fa',
    borderRadius: '8px',
  },

  fileInfoText: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#202124',
    margin: '0 0 12px 0',
  },

  fileList: {
    maxHeight: '120px',
    overflow: 'auto',
  },

  fileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
    fontSize: '13px',
  },

  fileName: {
    color: '#202124',
    flex: 1,
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },

  fileSize: {
    color: '#5f6368',
    marginLeft: '8px',
  },

  modalButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },

  cancelButton: {
    background: 'transparent',
    border: '1px solid #dadce0',
    borderRadius: '6px',
    padding: '8px 16px',
    color: '#5f6368',
    cursor: 'pointer',
    fontSize: '14px',
  },

  confirmButton: {
    background: '#1a73e8',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  },

  disabledButton: {
    background: '#dadce0',
    color: '#9aa0a6',
    cursor: 'not-allowed',
  },
}

export default SourcePanel 