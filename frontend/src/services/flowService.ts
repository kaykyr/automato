import axios from 'axios';
import { FlowData } from '../types/flow.types';

const API_BASE = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3001/api/v1' 
  : 'http://localhost:3002/api/v1';

export const flowService = {
  // Create a new flow
  async createFlow(flowData: Partial<FlowData>) {
    try {
      console.log('Creating flow with data:', flowData);
      const response = await axios.post(`${API_BASE}/flows`, flowData);
      console.log('Flow created:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating flow:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get all flows
  async getAllFlows() {
    const response = await axios.get(`${API_BASE}/flows`);
    return response.data || [];
  },

  // Get a specific flow
  async getFlow(id: string) {
    const response = await axios.get(`${API_BASE}/flows/${id}`);
    return response.data;
  },

  // Update a flow
  async updateFlow(id: string, flowData: Partial<FlowData>) {
    const response = await axios.patch(`${API_BASE}/flows/${id}`, flowData);
    return response.data;
  },

  // Delete a flow
  async deleteFlow(id: string) {
    const response = await axios.delete(`${API_BASE}/flows/${id}`);
    return response.data;
  },

  // Execute a flow
  async executeFlow(id: string, variables?: Record<string, any>) {
    const response = await axios.post(`${API_BASE}/flows/${id}/execute`, { variables });
    return response.data;
  },

  // Get flow executions
  async getFlowExecutions(flowId: string) {
    const response = await axios.get(`${API_BASE}/flows/${flowId}/executions`);
    return response.data;
  },

  // Get execution details
  async getExecution(executionId: string) {
    const response = await axios.get(`${API_BASE}/flows/executions/${executionId}`);
    return response.data;
  },
};