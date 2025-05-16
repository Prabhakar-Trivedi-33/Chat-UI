import React, { useState, useRef, useEffect } from 'react';
import './ArthChat.css';

const ArthChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      content: 'Upload your portfolio images from any broker site such as Groww, Zerodha to request portfolio analysis',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  
  // Customer and session IDs - in real app these would come from authentication
  const customerId = "1234";
  const sessionId = `session_${Date.now()}`;
  
  // Mock authentication token - in real app this would come from your auth flow
  const authToken = "your_access_token";

  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setSelectedImages([...selectedImages, ...files]);
    }
    setShowMediaOptions(false);
  };

  // Upload images to S3 via API
  const uploadImagesToS3 = async () => {
    const uploadedImages = [];
    
    try {
      for (const image of selectedImages) {
        const requestBody = {
          sessionId: sessionId,
          customerId: customerId,
          media: {
            type: "image",
            data: image.name,
            description: "Portfolio screenshot"
          }
        };
        
        const response = await fetch("https://co.inwealthera.com/api/user/media/chat/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (data.status === "SUCCESS") {
          uploadedImages.push({
            type: "IMAGE",
            url: data.body.url,
            description: "Portfolio screenshot"
          });
        } else {
          throw new Error(data.message || "Failed to upload image");
        }
      }
      
      return uploadedImages;
    } catch (error) {
      console.error("Error uploading images:", error);
      return [];
    }
  };

  // Handle analyzing portfolio button click
  const handleAnalyzePortfolio = async () => {
    if (selectedImages.length === 0) {
      // Prompt user to upload images first
      alert("Please upload portfolio images first");
      return;
    }
    
    await sendMessage("Analyze my portfolio");
  };

  // Send message to backend
  const sendMessage = async (messageContent = inputMessage) => {
    if ((!messageContent || messageContent.trim() === '') && selectedImages.length === 0) return;

    // Add user message to chat
    const userMessageId = Date.now();
    const userMessage = {
      id: userMessageId,
      sender: 'user',
      content: messageContent,
      images: selectedImages.map(img => URL.createObjectURL(img)),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      // Upload images if any
      const uploadedMedias = selectedImages.length > 0 ? await uploadImagesToS3() : [];
      
      // Create request body
      const requestBody = {
        sessionId: sessionId,
        customerId: customerId,
        message: messageContent,
        medias: uploadedMedias
      };
      
      // Clear selected images
      setSelectedImages([]);
      
      // Make API call with streaming response
      await fetchStreamingResponse(requestBody, userMessageId);
      
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Add error message
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'assistant',
        content: "Sorry, I couldn't process your request. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      
      setLoading(false);
    }
  };

  // Handle streaming responses
  const fetchStreamingResponse = async (requestBody, userMessageId) => {
    try {
      const response = await fetch("https://co.inwealthera.com/api/user/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify(requestBody)
      });

      // Check if response is OK
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Set up stream reader
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      // Add placeholder for streaming response
      const assistantMessageId = Date.now();
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        sender: 'assistant',
        content: '',
        isStreaming: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      
      let streamText = '';
      let streamingStarted = false;
      
      // Process the stream
      while (true) {
        const { value, done } = await reader.read();
        
        if (done) {
          // Stream complete - finalize message
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: streamText, isStreaming: false, suggestedFollowUps: [] } 
              : msg
          ));
          setStreamingText('');
          break;
        }
        
        // Decode chunk and handle
        const chunk = decoder.decode(value, { stream: true });
        
        try {
          // For this example, assume each chunk is a complete JSON object
          // In reality, you might need to buffer and parse as complete messages arrive
          const data = JSON.parse(chunk);
          
          if (data.status === "SUCCESS") {
            if (!streamingStarted) {
              streamingStarted = true;
            }
            
            if (data.body) {
              // Update streaming text
              streamText = data.body.message || '';
              setStreamingText(streamText);
              
              // Update message with current stream content
              setMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId 
                  ? { 
                      ...msg, 
                      content: streamText,
                      medias: data.body.medias || [],
                      suggestedFollowUps: data.body.suggestedFollowUps || [] 
                    } 
                  : msg
              ));
            }
          } else {
            throw new Error(data.message || "Unknown error occurred");
          }
        } catch (e) {
          // In case the chunk isn't valid JSON, treat it as plain text
          streamText += chunk;
          setStreamingText(streamText);
          
          // Update message with current stream content
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId ? { ...msg, content: streamText } : msg
          ));
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Streaming error:", error);
      setLoading(false);
      
      // Add error message
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'assistant',
        content: "Sorry, I couldn't process your request. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
  };

  // Handle key press (send on Enter)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handle follow-up suggestion click
  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  // Handle taking a photo (would integrate with device camera)
  const handleTakePhoto = () => {
    // In a real implementation, this would open the device camera
    alert("Camera functionality would open here");
    setShowMediaOptions(false);
  };

  // Handle clicking the attachment button
  const handleAttachmentClick = () => {
    setShowMediaOptions(prev => !prev);
  };

  return (
    <div className="arth-chat-container">
      <div className="arth-chat-header">
        <div className="arth-chat-back">
          <button className="back-button">
            <span>&#8592;</span>
          </button>
        </div>
        <div className="arth-chat-title">Arth: Your Financial Assistant</div>
        <div className="arth-chat-actions">
          <button className="history-button">
            <span>&#x23F0;</span>
          </button>
        </div>
      </div>
      
      <div className="arth-chat-messages" ref={chatContainerRef}>
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`message ${message.sender === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-content">
              {message.content}
              
              {/* Display images if any */}
              {message.images && message.images.length > 0 && (
                <div className="message-images">
                  {message.images.map((img, index) => (
                    <img key={index} src={img} alt="Portfolio" className="portfolio-image" />
                  ))}
                </div>
              )}
              
              {/* Display media from response if any */}
              {message.medias && message.medias.length > 0 && (
                <div className="message-medias">
                  {message.medias.map((media, index) => (
                    media.type === "image" && (
                      <img 
                        key={index} 
                        src={media.url} 
                        alt={media.description || "Analysis"} 
                        className="analysis-image" 
                      />
                    )
                  ))}
                </div>
              )}
              
              {/* Streaming indicator */}
              {message.isStreaming && (
                <div className="streaming-indicator">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              )}
              
              {/* Suggested follow-ups */}
              {message.suggestedFollowUps && message.suggestedFollowUps.length > 0 && (
                <div className="suggested-followups">
                  {message.suggestedFollowUps.map((suggestion, index) => (
                    <button 
                      key={index} 
                      className="followup-button"
                      onClick={() => handleSuggestionClick(suggestion.content)}
                    >
                      {suggestion.content}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="message-timestamp">{message.timestamp}</div>
          </div>
        ))}
        
        {/* Show portfolio analysis button after initial message */}
        {messages.length === 1 && (
          <div className="analyze-portfolio-button-container">
            <button 
              className="analyze-portfolio-button"
              onClick={handleAnalyzePortfolio}
            >
              Analyze my portfolio
            </button>
          </div>
        )}
        
        {/* Show selected images preview */}
        {selectedImages.length > 0 && (
          <div className="selected-images-preview">
            {selectedImages.map((img, index) => (
              <div key={index} className="image-preview-container">
                <img 
                  src={URL.createObjectURL(img)} 
                  alt={`Selected ${index}`} 
                  className="image-preview" 
                />
                <button 
                  className="remove-image-button"
                  onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== index))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="arth-chat-input-container">
        {/* Media options popup */}
        {showMediaOptions && (
          <div className="media-options-popup">
            <div className="media-option" onClick={() => alert("Connect to Google Drive")}>
              <span className="media-option-icon">📁</span>
              <span className="media-option-text">Connect to Google Drive</span>
            </div>
            <div className="media-option" onClick={() => alert("Connect to Microsoft OneDrive (personal)")}>
              <span className="media-option-icon">☁️</span>
              <span className="media-option-text">Connect to Microsoft OneDrive (personal)</span>
            </div>
            <div className="media-option" onClick={() => alert("Connect to Microsoft OneDrive (work/school)")}>
              <span className="media-option-icon">☁️</span>
              <span className="media-option-text">Connect to Microsoft OneDrive (work/school)</span>
              <span className="media-option-description">Includes SharePoint</span>
            </div>
            <div className="media-option" onClick={handleTakePhoto}>
              <span className="media-option-icon">📷</span>
              <span className="media-option-text">Take photo</span>
            </div>
            <div className="media-option" onClick={() => fileInputRef.current.click()}>
              <span className="media-option-icon">🖼️</span>
              <span className="media-option-text">Add photos</span>
            </div>
            <div className="media-option" onClick={() => alert("Add files")}>
              <span className="media-option-icon">📎</span>
              <span className="media-option-text">Add files</span>
            </div>
          </div>
        )}
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          style={{ display: 'none' }} 
          accept="image/*" 
          multiple 
        />
        
        <div className="arth-chat-input">
          <button 
            className="attachment-button" 
            onClick={handleAttachmentClick}
          >
            📎
          </button>
          <input
            type="text"
            placeholder="Ask Arth"
            value={inputMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <button 
            className="voice-button" 
            onClick={() => alert("Voice input would start here")}
          >
            🎤
          </button>
          <button 
            className="send-button" 
            onClick={() => sendMessage()}
            disabled={loading || (!inputMessage && selectedImages.length === 0)}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArthChat;
