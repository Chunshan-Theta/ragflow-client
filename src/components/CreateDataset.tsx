import React from 'react';
import { Button, Input, Form, message, Card } from 'antd';

interface Dataset {
  id: string;
  name: string;
}

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
      } else {
        message.error(data.message);
      }
    } catch (error) {
      message.error('Failed to create dataset');
    }
  };

  return (
    <Card title="Create Dataset">
      <Form onFinish={createDataset}>
        <Form.Item 
          name="name" 
          rules={[{ required: true, message: 'Please input dataset name!' }]}
        >
          <Input placeholder="Dataset Name" />
        </Form.Item>
        <Form.Item name="description">
          <Input.TextArea placeholder="Description (optional)" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Create Dataset
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default CreateDataset; 