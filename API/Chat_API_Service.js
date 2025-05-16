// Service to handle API calls for the Arth Chat application

const API_BASE_URL = 'https://co.inwealthera.com/api/user';
const AUTH_TOKEN = 'your_access_token'; // In a real app, this would be securely managed

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || `API error: ${response.status}`);
  }
  return response;
};

// Upload images to S3
export const uploadImage = async (sessionId, customerId, imageFile) => {
  try {
    const requestBody = {
      sessionId,
      customerId,
      media: {
        type: 'image',
        data: imageFile.name,
        description: 'Portfolio screenshot'
      }
    };

    const response = await fetch(`${API_BASE_URL}/media/chat/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify(requestBody)
    });

    const parsedResponse = await handleResponse(response);
    return await parsedResponse.json();
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Send chat message with optional media attachments
export const sendChatMessage = async (sessionId, customerId, message, medias = []) => {
  try {
    const requestBody = {
      sessionId,
      customerId,
      message,
      medias
    };

    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify(requestBody)
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
};

// Process streaming response
export const processStreamingResponse = async (response, onChunkReceived, onComplete, onError) => {
  try {
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      
      if (done) {
        // Process any remaining data in buffer
        if (buffer.trim()) {
          try {
            const parsedData = JSON.parse(buffer);
            onChunkReceived(parsedData);
          } catch (e) {
            onChunkReceived({ text: buffer });
          }
        }
        onComplete();
        break;
      }

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete JSON objects from buffer
      let startIdx = 0;
      let endIdx;
      let parsedData;

      // Find complete JSON objects in the buffer
      while ((endIdx = findJsonEnd(buffer, startIdx)) !== -1) {
        try {
          const jsonStr = buffer.substring(startIdx, endIdx + 1);
          parsedData = JSON.parse(jsonStr);
          onChunkReceived(parsedData);
          startIdx = endIdx + 1;
        } catch (e) {
          // Move startIdx forward to search for next valid JSON
          startIdx++;
        }
      }

      // Remove processed data from buffer
      if (startIdx > 0) {
        buffer = buffer.substring(startIdx);
      }
    }
  } catch (error) {
    console.error('Error processing streaming response:', error);
    onError(error);
  }
};

// Helper function to find the end of a JSON object in a string
const findJsonEnd = (str, startIdx) => {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIdx; i < str.length; i++) {
    const char = str[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (char === '\\') {
        escape = true;
      } else if (char === '"') {
        inString = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      } else if (char === '{' || char === '[') {
        depth++;
      } else if (char === '}' || char === ']') {
        depth--;
        if (depth === 0) {
          return i;
        }
      }
    }
  }

  return -1; // No complete JSON object found
};
