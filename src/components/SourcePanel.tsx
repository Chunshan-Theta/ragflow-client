import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createDatasetApi, Dataset, Document, Settings } from '../utils/datasetApi'
import UploadModal from './UploadModal'

const SourcePanel: React.FC = () => {
  const navigate = useNavigate()
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [selectedDatasets, setSelectedDatasets] = useState<Set<string>>(new Set())
  const [isUploading, setIsUploading] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[] | null>(null)
  const [targetDatasetId, setTargetDatasetId] = useState<string>('')
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null)
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)

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
      const datasetApi = createDatasetApi(settings)
      const datasetsData = await datasetApi.fetchDatasets()
      setDatasets(datasetsData)
      // 默认选中所有数据集
      const allIds = new Set<string>(datasetsData.map((dataset: Dataset) => dataset.id))
      setSelectedDatasets(allIds)
    } catch (error) {
      console.error('Failed to fetch datasets:', error)
    }
  }

  const fetchDocuments = async (datasetId: string) => {
    if (!settings) return

    console.log('Fetching documents for dataset:', datasetId)
    setIsLoadingDocuments(true)
    try {
      const datasetApi = createDatasetApi(settings)
      const documentsData = await datasetApi.fetchDocuments(datasetId)
      console.log('Setting documents:', documentsData.length, 'documents')
      setDocuments(documentsData)
      setSelectedDatasetId(datasetId)
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    } finally {
      setIsLoadingDocuments(false)
    }
  }

  const handleDatasetClick = (datasetId: string) => {
    console.log('Clicking dataset:', datasetId, 'Current selected:', selectedDatasetId)
    
    // If clicking the same dataset, toggle it off
    if (selectedDatasetId === datasetId) {
      setSelectedDatasetId(null)
      setDocuments([])
      return
    }
    
    // Otherwise fetch documents for the new dataset
    fetchDocuments(datasetId)
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
      const datasetApi = createDatasetApi(settings)
      const documentIds = await datasetApi.uploadDocuments(targetDatasetId, selectedFiles)
      
      if (documentIds.length > 0) {
        await datasetApi.parseDocuments(targetDatasetId, documentIds)
      }
      
      fetchDatasets() // 刷新数据集列表
      setShowUploadModal(false)
      setSelectedFiles(null)
      setTargetDatasetId('')
      alert(`成功上傳 ${selectedFiles.length} 個文件，需要等待解析完成才能使用。`)
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
      </div>

      {/* 数据集选择 */}


      {/* 文档列表 */}
      <div style={styles.documentList}>
        {datasets.map((dataset) => (
          <div 
            key={dataset.id}
            style={{
              ...styles.datasetItem,
              ...(selectedDatasetId === dataset.id ? styles.selectedDatasetItem : {})
            }}
          >
            <div style={styles.datasetHeader}>
              <div style={styles.datasetIcon}>📄</div>
              <div style={styles.datasetInfo}>
                <div style={styles.datasetName}>{dataset.name}</div>
                <div 
                  style={styles.datasetMeta}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDatasetClick(dataset.id)
                  }}
                >
                  {dataset.document_count} 個參考資料
                </div>
                {dataset.description && (
                  <div style={styles.datasetDescription}>
                    {dataset.description}
                  </div>
                )}
              </div>
            </div>
            
            {/* 显示文档列表 */}
            {selectedDatasetId === dataset.id && (
              <div style={styles.documentsContainer}>
                
                {isLoadingDocuments ? (
                  <div style={styles.loadingDocuments}>
                    <div style={styles.spinner}></div>
                    <span>載入文件中...</span>
                  </div>
                ) : (
                  <div style={styles.documentsList}>
                    {documents.length > 0 ? (
                      documents.map((doc) => (
                        <div key={doc.id} style={styles.documentItem}>
                          <div style={styles.documentIcon}>📄</div>
                          <div style={styles.documentInfo}>
                            <div style={styles.documentName}>{doc.name}</div>
                            <div style={styles.documentMeta}>
                              {doc.type} • {doc.create_date} • {doc.chunk_count} chunks • {Math.round(doc.size / 1024)} KB
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={styles.noDocuments}>
                        暫無文件
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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
      <UploadModal
        visible={showUploadModal}
        datasets={datasets}
        selectedFiles={selectedFiles}
        targetDatasetId={targetDatasetId}
        setTargetDatasetId={setTargetDatasetId}
        isUploading={isUploading}
        onConfirm={handleUploadConfirm}
        onCancel={handleUploadCancel}
      />
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
    gap: '12px',
    borderBottom: '1px solid #3a3d41',
    cursor: 'pointer',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  selectedDatasetItem: {
    backgroundColor: '#3a3d41',
  },

  datasetHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
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
    cursor: 'pointer',
    userSelect: 'none',
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

  // 文档列表样式
  documentsContainer: {
    marginTop: '12px',
    padding: '12px 20px',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e8eaed',
  },

  loadingDocuments: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 0',
    color: '#5f6368',
  },

  documentsList: {
    maxHeight: '55vh', // 控制文档列表的最大高度
    overflowY: 'auto',
  },

  documentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 0',
    borderBottom: '1px solid #e8eaed',
    cursor: 'pointer',
  },

  documentIcon: {
    fontSize: '16px',
    width: '20px',
    textAlign: 'center',
  },

  documentInfo: {
    flex: 1,
  },

  documentName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#202124',
    marginBottom: '2px',
  },

  documentMeta: {
    fontSize: '12px',
    color: '#5f6368',
  },

  noDocuments: {
    textAlign: 'center',
    padding: '20px 0',
    color: '#9aa0a6',
  },

  documentManagementButton: {
    padding: '12px 0',
    borderBottom: '1px solid #e8eaed',
    marginBottom: '8px',
  },

  manageDocsButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: '#4285f4',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    width: '100%',
    justifyContent: 'center',
  },

  manageDocsIcon: {
    fontSize: '14px',
  },
}

export default SourcePanel 