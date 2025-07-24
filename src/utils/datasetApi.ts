export interface Document {
  id: string
  name: string
  type: string
  create_date: string
  status: string
  chunk_count: number
  size: number
  run: string
  location: string
}

export interface Chunk {
  id: string
  content: string
  document_id: string
  dataset_id: string
  available: boolean
  docnm_kwd: string
  image_id: string
  important_keywords: string[]
  positions: any[]
  questions: any[]
}

export interface Dataset {
  id: string
  name: string
  description?: string | null
  document_count: number
  documents?: Document[]
}

export interface Settings {
  apiUrl: string
  agentId: string
  apiKey: string
}

export interface ApiResponse<T = any> {
  code: number
  data: T
  message?: string
}

export class DatasetApi {
  private settings: Settings

  constructor(settings: Settings) {
    this.settings = settings
  }

  // 获取所有数据集
  async fetchDatasets(): Promise<Dataset[]> {
    try {
      const response = await fetch(`${this.settings.apiUrl}/api/v1/datasets`, {
        headers: {
          'Authorization': `Bearer ${this.settings.apiKey}`
        }
      })
      
      const data: ApiResponse<Dataset[]> = await response.json()
      if (data.code === 0 && Array.isArray(data.data)) {
        return data.data
      } else {
        throw new Error(data.message || 'Failed to fetch datasets')
      }
    } catch (error) {
      console.error('Failed to fetch datasets:', error)
      throw error
    }
  }

  // 获取数据集中的文档
  async fetchDocuments(datasetId: string, page: number = 1, pageSize: number = 100): Promise<Document[]> {
    try {
      const response = await fetch(`${this.settings.apiUrl}/api/v1/datasets/${datasetId}/documents?page=${page}&page_size=${pageSize}`, {
        headers: {
          'Authorization': `Bearer ${this.settings.apiKey}`
        }
      })
      
      const data: ApiResponse<{ docs: Document[] }> = await response.json()
      if (data.code === 0 && data.data && Array.isArray(data.data.docs)) {
        return data.data.docs
      } else {
        throw new Error(data.message || 'Failed to fetch documents')
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error)
      throw error
    }
  }

  // 上传文档到数据集
  async uploadDocuments(datasetId: string, files: File[]): Promise<string[]> {
    try {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('file', file)
      })

      const response = await fetch(`${this.settings.apiUrl}/api/v1/datasets/${datasetId}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.settings.apiKey}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`)
      }

      const uploadResult: ApiResponse<any> = await response.json()
      
      // 提取文档ID
      let documentIds: string[] = []
      if (uploadResult.data && Array.isArray(uploadResult.data)) {
        documentIds = uploadResult.data.map((doc: any) => doc.id)
      } else if (uploadResult.data && uploadResult.data.document_ids && Array.isArray(uploadResult.data.document_ids)) {
        documentIds = uploadResult.data.document_ids
      }

      return documentIds
    } catch (error) {
      console.error('Upload failed:', error)
      throw error
    }
  }

  // 解析文档
  async parseDocuments(datasetId: string, documentIds: string[]): Promise<void> {
    try {
      const response = await fetch(`${this.settings.apiUrl}/api/v1/datasets/${datasetId}/chunks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.apiKey}`
        },
        body: JSON.stringify({
          document_ids: documentIds
        })
      })
      
      if (!response.ok) {
        throw new Error(`Parse failed: ${response.status}`)
      }

      const data: ApiResponse = await response.json()
      if (data.code !== 0) {
        throw new Error(data.message || 'Parse failed')
      }
    } catch (error) {
      console.error('Parse failed:', error)
      throw error
    }
  }

  // 删除文档
  async deleteDocument(datasetId: string, documentId: string): Promise<void> {
    try {
      const response = await fetch(`${this.settings.apiUrl}/api/v1/datasets/${datasetId}/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.settings.apiKey}`
        }
      })

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`)
      }

      const data: ApiResponse = await response.json()
      if (data.code !== 0) {
        throw new Error(data.message || 'Delete failed')
      }
    } catch (error) {
      console.error('Delete failed:', error)
      throw error
    }
  }

  // 创建数据集
  async createDataset(name: string, description?: string): Promise<Dataset> {
    try {
      const response = await fetch(`${this.settings.apiUrl}/api/v1/datasets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.apiKey}`
        },
        body: JSON.stringify({
          name,
          description: description || 'Document management dataset'
        })
      })

      const data: ApiResponse<Dataset> = await response.json()
      if (data.code === 0) {
        return data.data
      } else {
        throw new Error(data.message || 'Failed to create dataset')
      }
    } catch (error) {
      console.error('Failed to create dataset:', error)
      throw error
    }
  }

  // 删除数据集
  async deleteDataset(datasetId: string): Promise<void> {
    try {
      const response = await fetch(`${this.settings.apiUrl}/api/v1/datasets/${datasetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.settings.apiKey}`
        }
      })

      if (!response.ok) {
        throw new Error(`Delete dataset failed: ${response.status}`)
      }

      const data: ApiResponse = await response.json()
      if (data.code !== 0) {
        throw new Error(data.message || 'Delete dataset failed')
      }
    } catch (error) {
      console.error('Delete dataset failed:', error)
      throw error
    }
  }

  // 更新数据集
  async updateDataset(datasetId: string, updates: Partial<Dataset>): Promise<void> {
    try {
      const response = await fetch(`${this.settings.apiUrl}/api/v1/datasets/${datasetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.apiKey}`
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error(`Update dataset failed: ${response.status}`)
      }

      const data: ApiResponse = await response.json()
      if (data.code !== 0) {
        throw new Error(data.message || 'Update dataset failed')
      }
    } catch (error) {
      console.error('Update dataset failed:', error)
      throw error
    }
  }

  // 获取文档的chunks
  async fetchChunks(
    datasetId: string, 
    documentId: string, 
    options: {
      keywords?: string
      page?: number
      pageSize?: number
      id?: string
    } = {}
  ): Promise<Chunk[]> {
    try {
      const { keywords, page = 1, pageSize = 1024, id } = options
      let url = `${this.settings.apiUrl}/api/v1/datasets/${datasetId}/documents/${documentId}/chunks?page=${page}&page_size=${pageSize}`
      
      if (keywords) {
        url += `&keywords=${encodeURIComponent(keywords)}`
      }
      if (id) {
        url += `&id=${encodeURIComponent(id)}`
      }

      console.log('Fetching chunks from URL:', url)
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.settings.apiKey}`
        }
      })
      
      const data = await response.json()
      console.log('Chunks API response:', data)
      
      // 处理API响应格式
      if (data.code === 0) {
        if (data.data && Array.isArray(data.data.chunks)) {
          console.log('Found chunks array with', data.data.chunks.length, 'items')
          return data.data.chunks
        } else if (Array.isArray(data.data)) {
          console.log('Found direct array with', data.data.length, 'items')
          return data.data
        } else {
          console.warn('Unexpected chunks data format:', data.data)
          return []
        }
      } else {
        throw new Error(data.message || 'Failed to fetch chunks')
      }
    } catch (error) {
      console.error('Failed to fetch chunks:', error)
      throw error
    }
  }
}

// 便捷函数
export const createDatasetApi = (settings: Settings): DatasetApi => {
  return new DatasetApi(settings)
} 