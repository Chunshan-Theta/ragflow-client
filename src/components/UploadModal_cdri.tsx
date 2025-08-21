import React from 'react'
import { Dataset } from '../utils/datasetApi'

interface UploadModalProps {
  visible: boolean
  datasets: Dataset[]
  selectedFiles: File[] | null
  targetDatasetId: string
  setTargetDatasetId: (id: string) => void
  isUploading: boolean
  onConfirm: () => void
  onCancel: () => void
}

const UploadModal: React.FC<UploadModalProps> = ({
  visible,
  datasets,
  selectedFiles,
  targetDatasetId,
  setTargetDatasetId,
  isUploading,
  onConfirm,
  onCancel,
}) => {
  React.useEffect(() => {
    const currentExists = datasets.some((d) => d.id === targetDatasetId)
    if (visible && datasets.length > 0 && (!targetDatasetId || !currentExists)) {
      setTargetDatasetId(datasets[0].id)
    }
  }, [visible, targetDatasetId, datasets, setTargetDatasetId])

  if (!visible) return null

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <div style={{display: 'none'}}>
          <h3 style={styles.modalTitle}>選擇知識庫</h3>
          <p style={styles.modalDescription}>選擇要上傳參考資料的知識庫：</p>

          <div style={styles.datasetSelect}>
            {datasets.map((dataset) => (
              <div
                key={dataset.id}
                style={{
                  ...styles.datasetOption,
                  ...(targetDatasetId === dataset.id ? styles.selectedOption : {}),
                }}
                onClick={() => setTargetDatasetId(dataset.id)}
              >
                <div style={styles.optionIcon}>📄</div>
                <div style={styles.optionInfo}>
                  <div style={styles.optionName}>{dataset.name}</div>
                  <div style={styles.optionMeta}>{dataset.document_count} 個參考資料</div>
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
        </div>

        {selectedFiles && (
          <div style={styles.fileInfo}>
            <p style={styles.fileInfoText}>將上傳 {selectedFiles.length} 個文件：</p>
            <div style={styles.fileList}>
              {selectedFiles.map((file, index) => (
                <div key={index} style={styles.fileItem}>
                  <span style={styles.fileName}>{file.name}</span>
                  <span style={styles.fileSize}>({Math.round(file.size / 1024)} KB)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={styles.modalButtons}>
          <button style={styles.cancelButton} onClick={onCancel}>取消</button>
          <button
            style={{
              ...styles.confirmButton,
              ...((!targetDatasetId || isUploading) ? styles.disabledButton : {}),
            }}
            onClick={onConfirm}
            disabled={!targetDatasetId || isUploading}
          >
            {isUploading ? '上传中...' : '確認上傳'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
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
    background: '#fff',
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

export default UploadModal 