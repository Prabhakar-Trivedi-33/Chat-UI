import React from 'react';

/**
 * This file demonstrates how the streaming response functionality works
 * in the Arth chat application
 */

// Example of how to handle streaming responses with the Fetch API
const fetchStreamingExample = async () => {
  // Create an AbortController to handle request cancellation
  const abortController = new AbortController();
  
  try {
    // Make the request
    const response = await fetch('https://co.inwealthera.com/api/user/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer auth_token'
      },
      body: JSON.stringify({
        sessionId: 'session123',
        customerId: '1234',
        message: 'Analyze my portfolio',
        medias: [
          {
            type: 'IMAGE',
            url: 'https://example.com/image.jpg',
            description: 'Portfolio screenshot'
          }
        ]
      }),
      signal: abortController.signal // Connect the abort controller
    });
    
    // Check if response is OK
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    // Get reader from the response body stream
    const reader = response.body.getReader();
    
    // Text decoder to convert chunks to text
    const decoder = new TextDecoder('utf-8');
    
    // Process the stream
    let done = false;
    let accumulatedData = '';
    
    while (!done) {
      // Read the next chunk
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      
      if (done) {
        // Stream finished
        break;
      }
      
      // Decode the chunk
      const chunkText = decoder.decode(value, { stream: true });
      
      // Add to accumulated data
      accumulatedData += chunkText;
      
      // Update UI with the current accumulated data
      // This creates the "typing" effect where text appears incrementally
      updateUI(chunkText);
    }
    
    // Process the full accumulated response if needed
    const fullResponse = JSON.parse(accumulatedData);
    processFinalResponse(fullResponse);
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Request was cancelled');
    } else {
      console.error('Error:', error);
    }
  }
};

// Example function to update UI with streaming content
const updateUI = (chunk) => {
  // In a real app, you would append this chunk to your React state
  console.log('Received chunk:', chunk);
  
  // Example of updating React state:
  // setStreamingMessage(prev => prev + chunk);
};

// Example function to process the final complete response
const processFinalResponse = (fullResponse) => {
  console.log('Full response:', fullResponse);
  
  // Example of what you might do with the final response:
  // setMessages(prev => [...prev, {
  //   id: `msg-${Date.now()}`,
  //   sender: 'assistant',
  //   text: fullResponse.body.message,
  //   medias: fullResponse.body.medias || [],
  //   timestamp: new Date().toISOString()
  // }]);
  // 
  // setSuggestedFollowUps(fullResponse.body.suggestedFollowUps || []);
};

// Example of how to cancel an ongoing stream
const cancelStream = (abortController) => {
  if (abortController) {
    abortController.abort();
  }
};

// Example of using Server-Sent Events (SSE) as an alternative
const sseExample = () => {
  const eventSource = new EventSource('https://co.inwealthera.com/api/user/chat/stream');
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    updateUI(data);
  };
  
  eventSource.onerror = (error) => {
    console.error('SSE Error:', error);
    eventSource.close();
  };
  
  // To close the connection:
  // eventSource.close();
};

// WebSocket example as another alternative
const websocketExample = () => {
  const socket = new WebSocket('wss://co.inwealthera.com/api/user/chat/ws');
  
  socket.onopen = () => {
    console.log('WebSocket connection established');
    
    // Send a message
    socket.send(JSON.stringify({
      sessionId: 'session123',
      customerId: '1234',
      message: 'Analyze my portfolio',
      medias: []
    }));
  };
  
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    updateUI(data);
  };
  
  socket.onclose = () => {
    console.log('WebSocket connection closed');
  };
  
  socket.onerror = (error) => {
    console.error('WebSocket Error:', error);
  };
  
  // To close the connection:
  // socket.close();
};

// Placeholder component to demonstrate where these functions would be used
const StreamingExamples = () => {
  return (
    <div>
      <h1>Streaming Response Examples</h1>
      <p>Check the console for examples of how streaming responses work.</p>
      <button onClick={fetchStreamingExample}>
        Test Fetch Streaming
      </button>
      <button onClick={sseExample}>
        Test SSE
      </button>
      <button onClick={websocketExample}>
        Test WebSockets
      </button>
    </div>
  );
};

export default StreamingExamples;
