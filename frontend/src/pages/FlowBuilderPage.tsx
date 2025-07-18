import React from 'react';
import { useParams } from 'react-router-dom';
import { FlowBuilderWrapper } from '../components/FlowBuilder';

export const FlowBuilderPage: React.FC = () => {
  const { flowId } = useParams<{ flowId?: string }>();
  
  return <FlowBuilderWrapper flowId={flowId} />;
};