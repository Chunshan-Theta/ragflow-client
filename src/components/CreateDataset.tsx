import React from 'react';
import { Button, Input, Form, message, Card } from 'antd';

interface Dataset {
  id: string;
  name: string;
  description?: string;
  permission?: 'me' | 'team';
  chunk_method?: string;
  parser_config?: {
    chunk_token_num?: number;
    delimiter?: string;
    html4excel?: boolean;
    layout_recognize?: string;
    task_page_size?: number;
    raptor?: { use_raptor: boolean };
  };
}

const DEFAULT_CONFIG = {
  chunk_method: 'naive',
  permission: 'me',
  parser_config: {
    chunk_token_num: 128,
    delimiter: "\n",
    html4excel: false,
    layout_recognize: "DeepDOC",
    task_page_size: 12,
    raptor: { use_raptor: false },
    graphrag: { use_graphrag: false },
    auto_keywords: 24
  }
};

interface Settings {
  apiUrl: string;
  agentId: string;
  apiKey: string;
}

interface CreateDatasetProps {
  settings: Settings;
  onDatasetCreated: (dataset: Dataset) => void;
}

const CreateDataset: React.FC<CreateDatasetProps> = ({ settings, onDatasetCreated }) => {
  const updateDataset = async (datasetId: string, dataset: Partial<Dataset>) => {
    try {
      const response = await fetch(`${settings.apiUrl}/api/v1/datasets/${datasetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          ...DEFAULT_CONFIG,
          ...dataset
        })
      });
      
      const data = await response.json();
      if (data.code === 0) {
        message.success('Dataset updated successfully!');
      } else {
        message.error(data.message);
      }
    } catch (error) {
      message.error('Failed to update dataset');
    }
  };

  const createDataset = async (values: { name: string; description?: string }) => {
    try {
      const response = await fetch(`${settings.apiUrl}/api/v1/datasets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          name: values.name,
          description: values.description || 'Test dataset'
        })
      });
      
      const data = await response.json();
      if (data.code === 0) {
        message.success('Dataset created successfully!');
        onDatasetCreated(data.data);
        await updateDataset(data.data.id, DEFAULT_CONFIG as Partial<Dataset>);
      } else {
        message.error(data.message);
      }
    } catch (error) {
      message.error('Failed to create dataset');
    }
  };

  return (
    <Card title="Setting Name">
      <Form onFinish={createDataset}>
        <Form.Item 
          name="name" 
          rules={[{ required: true, message: 'Please input dataset name!' }]}
        >
          <Input placeholder="Name" />
        </Form.Item>
        <Form.Item name="description">
          <Input.TextArea placeholder="Description" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Create
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default CreateDataset; 