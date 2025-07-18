import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FlowBuilderPage } from './pages/FlowBuilderPage';
import './App.css';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/flow" replace />} />
          <Route path="/flow" element={<FlowBuilderPage />} />
          <Route path="/flow/:flowId" element={<FlowBuilderPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;