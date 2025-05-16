
Screenshot 20250516 095024.png
Screenshot 20250516 095040.png

Arth Chat UI Assignment Features to be supported Ability for the user to upload multiple images Ability for the user to engage in portfolio analysis via request/response below Ability to support streaming response Chat UI Screen Chat UI will have to make two make two API calls: A

pasted

Implement the streaming response functionality
integrate the multiple API calls
Edit
I'll help you implement the Chat UI with the requested functionalities based on the provided specification document and UI mockups. Let's break this down into components and implementation steps.

Understanding the Requirements
From the provided information, we need to build a Chat UI that supports:

Multiple image uploads
Portfolio analysis via request/response
Streaming response handling
The UI flow appears to involve:

A chat interface where users can send messages and upload images
The ability to analyze financial portfolios from uploaded images
Support for streaming responses from the backend
Implementation Approach
Let's create a React-based implementation for this Chat UI.


Chat UI Implementation
Code 

Chat UI Styles
Code 

Drafting artifact...
 



Continue

Edit
Let me finish the implementation of the Chat UI application with the necessary components for handling streaming responses and multiple API calls.


App Component with API Services
Code 

Enhanced ChatUI Component
Code 
Now I'll create a StreamManager component to handle the streaming response functionality more comprehensively:


Stream Manager Hook
Code 

Main Entry Point
Code 

Drafting artifact...
 




Continue

import React, { useState, useEffect, useRef } from 'react';
import { StreamReader, ChatService } from './App';
import './ChatUI.css';
import { Send, Paperclip, X, Camera, FileImage, File } from 'lucide-react';

const ChatUI = () => {
  // State management
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [suggestedFollowUps, setSuggestedFollowUps] = useState([]);
  const [sessionId] = useState(`session_${Date.now()}`);
  const [customerId] = useState('1234'); // This should be set dynamically based on authentication
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamReaderRef = useRef(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Cleanup stream reader on unmount
  useEffect(() => {
    return () => {
      if (streamReaderRef.current) {
        streamReaderRef.current.close();
      }
    };
  }, []);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleInputChange = (e) => {
    setInput(e.target.value);
  };
  
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    const newSelectedImages = [...selectedImages];
    
    imageFiles.forEach(file => {
      // Create a preview URL for the image
      const imageUrl = URL.createObjectURL(file);
      newSelectedImages.push({
        file,
        previewUrl: imageUrl,
        name: file.name,
        uploading: false,
        uploaded: false,
        url: null
      });
    });
    
    setSelectedImages(newSelectedImages);
    setShowUploadOptions(false);
  };
  
  const removeImage = (index) => {
    const newImages = [...selectedImages];
    // Release the object URL to avoid memory leaks
    URL.revokeObjectURL(newImages[index].previewUrl);
    newImages.splice(index, 1);
    setSelectedImages(newImages);
  };
  
  const uploadImage = async (image, index) => {
    try {
      // Update state to show uploading status
      const updatedImages = [...selectedImages];
      updatedImages[index] = { ...updatedImages[index], uploading: true };
      setSelectedImages(updatedImages);
      
      // Prepare the media data
      const mediaData = {
        type: "image",
        data: image.name,
        description: "Portfolio screenshot"
      };
      
      // Call the upload service
      const response = await ChatService.getUploadUrl(
        sessionId, 
        customerId, 
        mediaData
      );
      
      if (response.status === 'SUCCESS') {
        // Update the image object with the uploaded URL
        const newImages = [...selectedImages];
        newImages[index] = { 
          ...newImages[index], 
          uploading: false, 
          uploaded: true,
          url: response.body.url 
        };
        setSelectedImages(newImages);
        return response.body.url;
      } else {
        throw new Error(response.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      
      // Update state to show upload failed
      const updatedImages = [...selectedImages];
      updatedImages[index] = { ...updatedImages[index], uploading: false, error: true };
      setSelectedImages(updatedImages);
      
      return null;
    }
  };
  
  const processStreamingResponse = async (streamReader, botMessageId) => {
    try {
      let completeResponse = null;
      
      while (!streamReader.done) {
        const chunk = await streamReader.readChunk();
        
        if (!chunk) break;
        
        if (chunk.incomplete) {
          // Update the streaming message with partial text
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === botMessageId 
                ? { ...msg, text: chunk.text, isStreaming: true }
                : msg
            )
          );
        } else {
          // We have a complete JSON response
          completeResponse = chunk;
          
          // Update the message with complete data
          if (completeResponse.body && completeResponse.status === 'SUCCESS') {
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === botMessageId 
                  ? { 
                      ...msg, 
                      text: completeResponse.body.message || '',
                      images: completeResponse.body.medias?.map(m => m.url) || [],
                      isStreaming: false
                    }
                  : msg
              )
            );
            
            // Set suggested follow-ups if available
            if (completeResponse.body.suggestedFollowUps) {
              setSuggestedFollowUps(completeResponse.body.suggestedFollowUps);
            }
          }
        }
      }
      
      // Ensure we set isStreaming to false when done
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, isStreaming: false }
            : msg
        )
      );
      
      return completeResponse;
    } catch (error) {
      console.error('Error processing streaming response:', error);
      
      // Update message to show error
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === botMessageId 
            ? { 
                ...msg, 
                text: 'Sorry, there was an error processing the response.',
                isStreaming: false,
                error: true 
              }
            : msg
        )
      );
      
      return null;
    }
  };
  
  const handleSendMessage = async () => {
    if ((!input.trim() && selectedImages.length === 0) || isLoading) return;
    
    setIsLoading(true);
    
    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: input,
      images: selectedImages.map(img => img.previewUrl)
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    
    try {
      // Upload all images first
      const uploadPromises = selectedImages.map((image, index) => uploadImage(image, index));
      const uploadedUrls = await Promise.all(uploadPromises);
      
      // Filter out any failed uploads
      const validUrls = uploadedUrls.filter(url => url !== null);
      
      // Prepare media array for API
      const mediaArray = validUrls.map((url, index) => ({
        type: "IMAGE",
        url: url,
        description: selectedImages[index].name || "portfolio image"
      }));
      
      // Add initial bot message with loading state
      const botMessageId = Date.now();
      setMessages(prevMessages => [
        ...prevMessages, 
        { 
          id: botMessageId,
          sender: 'bot', 
          text: '', 
          images: [],
          isStreaming: true
        }
      ]);
      
      // Send message to chat API
      const response = await ChatService.sendMessage(
        sessionId,
        customerId,
        input.trim(),
        mediaArray
      );
      
      // Create stream reader for handling the response
      streamReaderRef.current = new StreamReader(response);
      
      // Process the streaming response
      await processStreamingResponse(streamReaderRef.current, botMessageId);
      
    } catch (error) {
      console.error('Error in chat flow:', error);
      
      // Add error message
      setMessages(prevMessages => [
        ...prevMessages, 
        { 
          id: Date.now(),
          sender: 'bot', 
          text: 'Sorry, there was an error processing your request. Please try again.',
          error: true
        }
      ]);
    } finally {
      setIsLoading(false);
      setSelectedImages([]);
      
      // Clean up stream reader
      if (streamReaderRef.current) {
        await streamReaderRef.current.close();
        streamReaderRef.current = null;
      }
    }
  };
  
  const handleSuggestedFollowUp = (content) => {
    setInput(content);
    setSuggestedFollowUps([]);
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleTakePhoto = () => {
    // Implementation for taking a photo would go here
    // Usually involves opening a camera component or native camera
    alert('Camera functionality would be implemented here');
    setShowUploadOptions(false);
  };
  
  const handleAddPhotos = () => {
    fileInputRef.current.click();
  };
  
  const handleAnalyzePortfolio = () => {
    // If there are no images selected, prompt to upload
    if (selectedImages.length === 0) {
      setShowUploadOptions(true);
      return;
    }
    
    // Otherwise, send a pre-defined message to analyze portfolio
    setInput('Analyze my portfolio');
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="back-button">
          <button aria-label="Go back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        <div className="chat-title">Arth: Your Financial Assistant</div>
        <div className="history-button">
          <button aria-label="Chat history">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="welcome-message">
            <p>Upload your portfolio images from any broker site such as Groww, Zerodha to request portfolio analysis</p>
            <button 
              className="analyze-button"
              onClick={handleAnalyzePortfolio}
            >
              Analyze my portfolio
            </button>
          </div>
        )}
      
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
          >
            {message.sender === 'bot' && (
              <div className="bot-avatar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="green" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              </div>
            )}
            
            <div className="message-content">
              {message.text && <p>{message.text}</p>}
              
              {message.images && message.images.length > 0 && (
                <div className="message-images">
                  {message.images.map((img, idx) => (
                    <img key={idx} src={img} alt={`Uploaded ${idx}`} />
                  ))}
                </div>
              )}
              
              {message.isStreaming && (
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {suggestedFollowUps.length > 0 && (
          <div className="suggested-followups">
            {suggestedFollowUps.map((followUp, idx) => (
              <button 
                key={idx} 
                onClick={() => handleSuggestedFollowUp(followUp.content)}
                className="followup-button"
              >
                {followUp.content}
              </button>
            ))}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {selectedImages.length > 0 && (
        <div className="selected-images">
          {selectedImages.map((image, idx) => (
            <div key={idx} className="selected-image">
              <img src={image.previewUrl} alt={`Selected ${idx}`} />
              <button 
                className="remove-image" 
                onClick={() => removeImage(idx)}
                aria-label="Remove image"
              >
                <X size={16} />
              </button>
              {image.uploading && <div className="upload-indicator">Uploading...</div>}
              {image.error && <div className="upload-error">Failed</div>}
            </div>
          ))}
        </div>
      )}
      
      <div className="chat-input-container">
        <button 
          className="attachment-button"
          onClick={() => setShowUploadOptions(prev => !prev)}
          aria-label="Attach files"
        >
          <Paperclip size={20} />
        </button>
        
        <input 
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Ask Arth"
          className="chat-input"
        />
        
        <button 
          className="send-button"
          onClick={handleSendMessage}
          disabled={isLoading || (!input.trim() && selectedImages.length === 0)}
          aria-label="Send message"
        >
          <Send size={20} fill={input.trim() || selectedImages.length > 0 ? "#ffffff" : "#cccccc"} />
        </button>
      </div>
      
      {showUploadOptions && (
        <div className="upload-options">
          <button onClick={() => setShowUploadOptions(false)} className="close-options">
            <X size={20} />
          </button>
          
          <button onClick={handleAddPhotos} className="upload-option">
            <FileImage size={20} />
            <span>Add photos</span>
          </button>
          
          <button onClick={handleTakePhoto} className="upload-option">
            <Camera size={20} />
            <span>Take photo</span>
          </button>
          
          <button className="upload-option">
            <File size={20} />
            <span>Add files</span>
          </button>
          
          <div className="cloud-options">
            <button className="cloud-option">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              <span>Connect to Google Drive</span>
            </button>
            
            <button className="cloud-option">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Connect to Microsoft OneDrive (personal)</span>
            </button>
            
            <button className="cloud-option">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Connect to Microsoft OneDrive (work/school)</span>
              <small>Includes SharePoint</small>
            </button>
          </div>
        </div>
      )}
      
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        multiple
        onChange={handleFileSelect}
      />
    </div>
  );
};

export default ChatUI;
