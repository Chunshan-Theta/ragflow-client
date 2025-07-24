import React, { useState, useEffect } from 'react'
import { createDatasetApi, Dataset, Document, Settings, Chunk } from '../utils/datasetApi'

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: '#1a1d21',
    color: '#ffffff',
    fontFamily: 'Arial, sans-serif',
  },

  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#1a1d21',
    color: '#ffffff',
  },

  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #3a3d41',
    borderTop: '4px solid #1a73e8',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },

  header: {
    background: '#2a2d31',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #3a3d41',
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },

  logo: {
    width: '40px',
    height: '40px',
    background: '#ff6b35',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoIcon: {
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: 'bold',
  },

  headerText: {
    display: 'flex',
    flexDirection: 'column',
  },

  mainTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffffff',
  },

  subTitle: {
    fontSize: '12px',
    color: '#9aa0a6',
  },

  headerRight: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },

  uploadButton: {
    background: '#ff6b35',
    border: 'none',
    borderRadius: '20px',
    padding: '8px 16px',
    color: '#ffffff',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },

  primaryUploadButton: {
    background: '#ff6b35',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    color: '#ffffff',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  uploadIcon: {
    fontSize: '14px',
  },

  plusIcon: {
    fontSize: '16px',
  },

  hiddenInput: {
    display: 'none',
  },

  mainContent: {
    display: 'flex',
    height: 'calc(100vh - 80px)',
  },

  sidebar: {
    width: '200px',
    background: '#2a2d31',
    padding: '20px 0',
    borderRight: '1px solid #3a3d41',
  },

  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    cursor: 'pointer',
    color: '#9aa0a6',
    fontSize: '14px',
  },

  activeNavItem: {
    background: '#ff6b35',
    color: '#ffffff',
    borderRadius: '8px',
    margin: '0 12px',
  },

  navIcon: {
    fontSize: '16px',
  },

  content: {
    flex: 1,
    padding: '24px',
    overflow: 'auto',
  },

  contentHeader: {
    marginBottom: '32px',
  },

  pageTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#ffffff',
    margin: '0 0 8px 0',
  },

  pageDescription: {
    fontSize: '14px',
    color: '#9aa0a6',
    margin: 0,
    lineHeight: 1.5,
  },

  documentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '20px',
  },

  documentCard: {
    background: '#2a2d31',
    border: '1px solid #3a3d41',
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '16px',
  },

  documentIcon: {
    fontSize: '20px',
    color: '#1a73e8',
    marginTop: '2px',
  },

  documentTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '4px',
    flex: 1,
  },

  documentMeta: {
    fontSize: '12px',
    color: '#9aa0a6',
  },

  documentDescription: {
    fontSize: '13px',
    color: '#9aa0a6',
    lineHeight: 1.5,
    marginBottom: '16px',
  },

  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '12px',
  },

  tag: {
    background: '#1a73e8',
    color: '#ffffff',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
  },

  topicFoldersLabel: {
    fontSize: '12px',
    color: '#9aa0a6',
    marginBottom: '8px',
  },

  topicFoldersContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },

  topicFolder: {
    background: '#34a853',
    color: '#ffffff',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
  },

  // 数据集选择样式
  datasetSection: {
    marginBottom: '32px',
  },

  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffffff',
    margin: '0 0 16px 0',
  },

  datasetList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  datasetItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    background: '#2a2d31',
    border: '1px solid #3a3d41',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  selectedDatasetItem: {
    borderColor: '#ff6b35',
    backgroundColor: '#3a3d41',
  },

  datasetIcon: {
    fontSize: '20px',
    color: '#1a73e8',
  },

  datasetInfo: {
    flex: 1,
  },

  datasetName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '4px',
  },

  datasetMeta: {
    fontSize: '12px',
    color: '#9aa0a6',
    marginBottom: '4px',
  },

  datasetDescription: {
    fontSize: '12px',
    color: '#9aa0a6',
    lineHeight: 1.4,
  },

  datasetArrow: {
    fontSize: '18px',
    color: '#9aa0a6',
    fontWeight: 'bold',
  },

  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },

  backButton: {
    background: 'transparent',
    border: '1px solid #3a3d41',
    borderRadius: '6px',
    padding: '8px 16px',
    color: '#9aa0a6',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  },

  // 文档列表样式
  documentsSection: {
    marginBottom: '32px',
  },

  loadingDocuments: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 0',
    color: '#9aa0a6',
  },

  noDocuments: {
    textAlign: 'center',
    padding: '40px 0',
    color: '#9aa0a6',
    fontSize: '14px',
  },

  chunksInfo: {
    display: 'flex',
    gap: '16px',
    marginTop: '12px',
  },

  chunksLabel: {
    fontSize: '12px',
    background: '#1a73e8',
    color: '#ffffff',
    padding: '4px 8px',
    borderRadius: '12px',
  },

  sizeLabel: {
    fontSize: '12px',
    background: '#34a853',
    color: '#ffffff',
    padding: '4px 8px',
    borderRadius: '12px',
  },



  // Chunks样式
  chunksSection: {
    marginBottom: '32px',
  },

  chunksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  chunkCard: {
    background: '#2a2d31',
    border: '1px solid #3a3d41',
    borderRadius: '12px',
    padding: '20px',
    transition: 'all 0.2s ease',
  },

  chunkHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '16px',
  },

  chunkIcon: {
    fontSize: '20px',
    color: '#ff6b35',
    marginTop: '2px',
  },

  chunkTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '4px',
    flex: 1,
  },

  chunkMeta: {
    fontSize: '12px',
    color: '#9aa0a6',
  },

  chunkContent: {
    fontSize: '14px',
    color: '#ffffff',
    lineHeight: 1.6,
    background: '#1a1d21',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #3a3d41',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },

  chunkMetadata: {
    marginTop: '16px',
    padding: '12px',
    background: '#1a1d21',
    borderRadius: '8px',
    border: '1px solid #3a3d41',
  },

  metadataLabel: {
    fontSize: '12px',
    color: '#9aa0a6',
    fontWeight: 'bold',
    minWidth: '80px',
    flexShrink: 0,
  },

  metadataContent: {
    fontSize: '11px',
    color: '#ffffff',
    background: '#2a2d31',
    padding: '4px 8px',
    borderRadius: '4px',
    margin: 0,
    flex: 1,
    wordBreak: 'break-word',
  },

  metadataRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    marginBottom: '8px',
  },

  debugInfo: {
    fontSize: '12px',
    color: '#ff6b35',
    background: '#1a1d21',
    padding: '8px',
    borderRadius: '4px',
    marginBottom: '16px',
    border: '1px solid #ff6b35',
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

interface DocumentCard {
  id: string
  title: string
  date: string
  size: string
  description: string
  tags: string[]
  topicFolders: string[]
}

const DocumentManagementPage: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[] | null>(null)
  const [targetDatasetId, setTargetDatasetId] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
    const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null)
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [isLoadingChunks, setIsLoadingChunks] = useState(false)
  const [showKeywords, setShowKeywords] = useState(true);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const handleKeywordClick = (kw: string) => {
    setSelectedKeywords(selected =>
      selected.includes(kw)
        ? selected.filter(k => k !== kw)
        : [...selected, kw]
    );
  };
  const filteredChunks = selectedKeywords.length === 0
    ? chunks
    : chunks.filter(chunk =>
        selectedKeywords.every(kw => (chunk.important_keywords || []).includes(kw))
      );

  // --- keywordCountBlock for chunk keyword stats ---
  let keywordCountBlock = null;
  if (chunks.length > 0) {
    const keywordCount: Record<string, number> = {};
    chunks.forEach(chunk => {
      (chunk.important_keywords || []).forEach(kw => {
        keywordCount[kw] = (keywordCount[kw] || 0) + 1;
      });
    });
    const sorted = Object.entries(keywordCount)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (sorted.length === 0) {
      keywordCountBlock = <span style={{ color: '#9aa0a6' }}>(無關鍵字)</span>;
    } else {
      keywordCountBlock = (
        <div>
          {sorted.map(([kw, count]) => (
            <span
              key={kw}
              onClick={() => handleKeywordClick(kw)}
              style={{
                display: 'inline-block',
                background: selectedKeywords.includes(kw) ? '#ffd600' : '#1a73e8',
                color: selectedKeywords.includes(kw) ? '#222' : '#fff',
                borderRadius: '12px',
                padding: '4px 12px',
                margin: '0 8px 8px 0',
                fontSize: '13px',
                cursor: 'pointer',
                border: selectedKeywords.includes(kw) ? '2px solid #ff6b35' : 'none',
                fontWeight: selectedKeywords.includes(kw) ? 700 : 400,
                transition: 'all 0.15s',
              }}
            >
              {kw} <span style={{ color: selectedKeywords.includes(kw) ? '#ff6b35' : '#ffd600' }}>×{count}</span>
            </span>
          ))}
        </div>
      );
    }
  }

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
    setIsLoading(false)
  }, [settings])

  const fetchDatasets = async () => {
    if (!settings) return

    try {
      const datasetApi = createDatasetApi(settings)
      const datasetsData = await datasetApi.fetchDatasets()
      setDatasets(datasetsData)
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
      setSelectedDocumentId(null)
      setChunks([])
      return
    }
    
    // Otherwise fetch documents for the new dataset
    fetchDocuments(datasetId)
  }

  const fetchChunks = async (datasetId: string, documentId: string) => {
    if (!settings) return

    console.log('Fetching chunks for document:', documentId)
    setIsLoadingChunks(true)
    try {
      const datasetApi = createDatasetApi(settings)
      const chunksData = await datasetApi.fetchChunks(datasetId, documentId)
      console.log('Setting chunks:', chunksData.length, 'chunks')
      console.log('Chunks data:', chunksData)
      setChunks(chunksData)
      setSelectedDocumentId(documentId)
      console.log('Selected document ID set to:', documentId)
      console.log('Current state - selectedDocumentId:', documentId, 'chunks length:', chunksData.length)
    } catch (error) {
      console.error('Failed to fetch chunks:', error)
    } finally {
      setIsLoadingChunks(false)
    }
  }

  const handleDocumentClick = (documentId: string) => {
    if (!selectedDatasetId) return
    fetchChunks(selectedDatasetId, documentId)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    setSelectedFiles(fileArray)
    setShowUploadModal(true)
    event.target.value = ''
  }

  const handleUploadConfirm = async () => {
    if (!selectedFiles || !targetDatasetId || !settings) return

    setIsUploading(true)
    
    try {
      const datasetApi = createDatasetApi(settings)
      const documentIds = await datasetApi.uploadDocuments(targetDatasetId, selectedFiles)
      
      if (documentIds.length > 0) {
        await datasetApi.parseDocuments(targetDatasetId, documentIds)
      }
      
      fetchDatasets()
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

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <span>載入中...</span>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* 顶部导航栏 */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>C</div>
          </div>
          <div style={styles.headerText}>
            <div style={styles.mainTitle}>CDRI AI 產業商情資訊網</div>
            <div style={styles.subTitle}>後台管理系統・商業研究院</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <label style={styles.uploadButton}>
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              style={styles.hiddenInput}
              accept=".pdf,.doc,.docx,.txt,.md"
            />
            <span style={styles.uploadIcon}>↑</span>
            智能上傳
          </label>
          <label style={styles.primaryUploadButton}>
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              style={styles.hiddenInput}
              accept=".pdf,.doc,.docx,.txt,.md"
            />
            <span style={styles.plusIcon}>+</span>
            智能上傳文檔
          </label>
        </div>
      </div>

      <div style={styles.mainContent}>
        {/* 左侧边栏 */}
        <div style={styles.sidebar}>
          <div style={{...styles.navItem, ...styles.activeNavItem}}>
            <span style={styles.navIcon}>📄</span>
            文檔管理
          </div>
          <div style={{...styles.navItem, display: 'none'}}>
            <span style={styles.navIcon}>🏷️</span>
            標籤管理
          </div>
          <div style={{...styles.navItem, display: 'none'}}>
            議題資料夾
          </div>
        </div>

        {/* 主要内容区域 */}
        <div style={styles.content}>
          <div style={styles.contentHeader}>
            <h1 style={styles.pageTitle}>文檔管理</h1>
            <p style={styles.pageDescription}>
              管理文檔並查看 AI 自動生成的議題歸類,每篇文檔可同時歸屬多個議題資料夾
            </p>
          </div>

          {/* 知识库选择 */}
          <div style={styles.datasetSection}>
            <h3 style={styles.sectionTitle}>知識庫</h3>
            <div style={styles.datasetList}>
              {datasets.map((dataset) => (
                <div 
                  key={dataset.id}
                  style={{
                    ...styles.datasetItem,
                    ...(selectedDatasetId === dataset.id ? styles.selectedDatasetItem : {})
                  }}
                  onClick={() => handleDatasetClick(dataset.id)}
                >
                  <div style={styles.datasetIcon}>📚</div>
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
                  <div style={styles.datasetArrow}>→</div>
                </div>
              ))}
            </div>
          </div>

          {/* 文档列表 */}
          {selectedDatasetId && !selectedDocumentId && (
            <div style={styles.documentsSection}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>
                  文檔列表 - {datasets.find(d => d.id === selectedDatasetId)?.name}
                </h3>
                <button 
                  style={styles.backButton}
                  onClick={() => {
                    setSelectedDatasetId(null)
                    setDocuments([])
                    setSelectedDocumentId(null)
                    setChunks([])
                  }}
                >
                  ← 返回知識庫
                </button>
              </div>
              {isLoadingDocuments ? (
                <div style={styles.loadingDocuments}>
                  <div style={styles.spinner}></div>
                  <span>載入文件中...</span>
                </div>
              ) : (
                <div style={styles.documentGrid}>
                  {documents.length > 0 ? (
                    documents.map((doc) => (
                      <div 
                        key={doc.id} 
                        style={styles.documentCard}
                        onClick={() => handleDocumentClick(doc.id)}
                      >
                        <div style={styles.cardHeader}>
                          <div style={styles.documentIcon}>📄</div>
                          <div style={styles.documentTitle}>{doc.name}</div>
                          <div style={styles.documentMeta}>
                            {doc.type} • {doc.create_date} • {doc.chunk_count} chunks • {Math.round(doc.size / 1024)} KB
                          </div>
                        </div>
                        
                        <div style={styles.documentDescription}>
                          文件類型: {doc.type} | 狀態: {doc.status} | 位置: {doc.location}
                        </div>
                        
                        <div style={styles.chunksInfo}>
                          <span style={styles.chunksLabel}>Chunks: {doc.chunk_count}</span>
                          <span style={styles.sizeLabel}>大小: {Math.round(doc.size / 1024)} KB</span>
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

          {/* Chunks列表 */}
          {selectedDocumentId && (
            <div style={styles.chunksSection}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>
                  Chunks - {documents.find(d => d.id === selectedDocumentId)?.name || '未知文檔'}
                </h3>
                <button 
                  style={styles.backButton}
                  onClick={() => {
                    setSelectedDocumentId(null)
                    setChunks([])
                  }}
                >
                  ← 返回文檔列表
                </button>
              </div>
              <div style={styles.debugInfo}>
                Debug: selectedDocumentId = {selectedDocumentId}, chunks.length = {chunks.length}, isLoadingChunks = {isLoadingChunks.toString()}
              </div>
              {/* 關鍵字統計區塊 */}
              {chunks.length > 0 && (
                <div style={{
                  marginBottom: '20px',
                  padding: '16px',
                  background: '#23272b',
                  borderRadius: '8px',
                  border: '1px solid #3a3d41',
                  color: '#fff',
                  fontSize: '14px',
                }}>
                  <div style={{display: 'flex', alignItems: 'center', marginBottom: 8}}>
                    <span style={{ fontWeight: 600 }}>所有重要關鍵字統計：</span>
                    <button
                      style={{
                        marginLeft: 12,
                        background: 'none',
                        border: 'none',
                        color: '#1a73e8',
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                      onClick={() => setShowKeywords(v => !v)}
                    >
                      {showKeywords ? '收合 ▲' : '展開 ▼'}
                    </button>
                    {selectedKeywords.length > 0 && (
                      <button
                        style={{
                          marginLeft: 12,
                          background: '#ff6b35',
                          border: 'none',
                          color: '#fff',
                          borderRadius: 8,
                          padding: '2px 10px',
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                        onClick={() => setSelectedKeywords([])}
                      >
                        清除篩選
                      </button>
                    )}
                  </div>
                  {showKeywords && keywordCountBlock}
                </div>
              )}
              {isLoadingChunks ? (
                <div style={styles.loadingDocuments}>
                  <div style={styles.spinner}></div>
                  <span>載入chunks中...</span>
                </div>
              ) : (
                <div style={styles.chunksList}>
                  {filteredChunks.length > 0 ? (
                    filteredChunks.map((chunk, index) => (
                      <div key={chunk.id} style={styles.chunkCard}>
                        <div style={styles.chunkHeader}>
                          <div style={styles.chunkIcon}>🔗</div>
                          <div style={styles.chunkTitle}>Chunk #{index + 1}</div>
                          <div style={styles.chunkMeta}>
                            ID: {chunk.id} • 可用: {chunk.available ? '是' : '否'}
                          </div>
                        </div>
                        
                        <div style={styles.chunkContent}>
                          {chunk.content}
                        </div>
                        
                        <div style={styles.chunkMetadata}>
                          <div style={styles.metadataRow}>
                            <span style={styles.metadataLabel}>文檔名稱:</span>
                            <span style={styles.metadataContent}>{chunk.docnm_kwd}</span>
                          </div>
                          <div style={styles.metadataRow}>
                            <span style={styles.metadataLabel}>重要關鍵字:</span>
                            <span style={styles.metadataContent}>
                              {chunk.important_keywords && chunk.important_keywords.length > 0 
                                ? chunk.important_keywords.join(', ') 
                                : '(空)'}
                            </span>
                          </div>
                          <div style={styles.metadataRow}>
                            <span style={styles.metadataLabel}>問題:</span>
                            <span style={styles.metadataContent}>
                              {chunk.questions && chunk.questions.length > 0 
                                ? chunk.questions.join(', ') 
                                : '(空)'}
                            </span>
                          </div>
                          <div style={{...styles.metadataRow, display: 'none'}}>
                            <span style={styles.metadataLabel}>位置資訊:</span>
                            <span style={styles.metadataContent}>
                              {chunk.positions && chunk.positions.length > 0 
                                ? JSON.stringify(chunk.positions) 
                                : '(空)'}
                            </span>
                          </div>
                          <div style={{...styles.metadataRow, display: 'none'}}>
                            <span style={styles.metadataLabel}>圖片ID:</span>
                            <span style={styles.metadataContent}>
                              {chunk.image_id || '(空)'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={styles.noDocuments}>
                      無符合篩選的 chunks
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 上传模态窗口 */}
      {showUploadModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>選擇知識庫</h3>
            <p style={styles.modalDescription}>
              選擇要上傳參考資料的知識庫：
            </p>
            
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

export default DocumentManagementPage 