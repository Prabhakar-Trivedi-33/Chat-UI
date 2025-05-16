import React, { useState, useEffect, useRef } from 'react';
import ChatUI from './ChatUI';

function App() {
  return (
    <div className="app">
      <ChatUI />
    </div>
  );
}

// API Service for handling chat interactions
export const ChatService = {
  // Function to get S3 upload URL
  getUploadUrl: async (sessionId, customerId, mediaData) => {
    try {
      const accessToken = localStorage.getItem('accessToken') || 'your_default_access_token';
      
      const response = await fetch('https://co.inwealthera.com/api/user/media/chat/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          sessionId,
          customerId,
          media: mediaData
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error getting upload URL:', error);
      throw error;
    }
  },
  
  // Function to send message to chat API
  sendMessage: async (sessionId, customerId, message, medias = []) => {
    try {
      const accessToken = localStorage.getItem('accessToken') || 'your_default_access_token';
      
      return await fetch('https://co.inwealthera.com/api/user/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          sessionId,
          customerId,
          message,
          medias
        })
      });
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
};

// StreamReader class for handling streaming responses
export class StreamReader {
  constructor(response) {
    this.reader = response.body.getReader();
    this.decoder = new TextDecoder('utf-8');
    this.buffer = '';
    this.done = false;
  }
  
  async readChunk() {
    if (this.done) return null;
    
    const { value, done } = await this.reader.read();
    
    if (done) {
      this.done = true;
      
      // Process any remaining data in the buffer
      if (this.buffer.length > 0) {
        const finalChunk = this.buffer;
        this.buffer = '';
        return finalChunk;
      }
      
      return null;
    }
    
    const chunk = this.decoder.decode(value, { stream: true });
    this.buffer += chunk;
    
    // Try to extract complete JSON objects
    try {
      const parsedData = JSON.parse(this.buffer);
      this.buffer = '';
      return parsedData;
    } catch (e) {
      // If we can't parse as JSON yet, return the raw chunk for incremental display
      const rawChunk = this.buffer;
      // Don't clear buffer here as we might be in the middle of a JSON object
      return { text: rawChunk, incomplete: true };
    }
  }
  
  async close() {
    if (this.reader && !this.done) {
      await this.reader.cancel();
      this.done = true;
    }
  }
}

// Initialize the application
if (typeof window !== 'undefined') {
  const ReactDOM = require('react-dom/client');
  const rootElement = document.getElementById('root');
  
  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}

export default App;
