import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function TestPrompts() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      console.log('Test: Loading prompts...');
      const response = await api.get('/system-prompts');
      console.log('Test: Response:', response.data);
      
      if (response.data && response.data.data) {
        setPrompts(response.data.data);
        console.log('Test: Set prompts:', response.data.data);
      }
    } catch (error) {
      console.error('Test: Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Prompts</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          <p>Total prompts: {prompts.length}</p>
          <ul>
            {prompts.map((prompt, index) => (
              <li key={prompt.id || index}>
                {prompt.name} - {prompt.category}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}