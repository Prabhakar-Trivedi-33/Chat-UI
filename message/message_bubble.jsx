import React from 'react';
import PropTypes from 'prop-types';
import './MessageBubble.css';

/**
 * Message bubble component for displaying chat messages
 */
const MessageBubble = ({ 
  message, 
  isUser = false, 
  isStreaming = false, 
  onSuggestionClick 
}) => {
  // Render images if present
  const renderImages = () => {
    if (!message.images && !message.medias) return null;
    
    const imagesToRender = message.images || 
      (message.medias ? message.medias.filter(m => m.type.toLowerCase() === 'image') : []);
    
    if (imagesToRender.length === 0) return null;
    
    return (
      <div className="message-media-container">
        {imagesToRender.map((img, index) => (
          <div key={index} className="message-media-item">
            <img 
              src={typeof img === 'string' ? img : img.url} 
              alt={typeof img === 'string' ? 'Uploaded content' : (img.description || 'Media content')} 
              className="message-media-image" 
            />
          </div>
        ))}
      </div>
    );
  };
  
  // Render suggested follow-ups if present
  const renderSuggestions = () => {
    if (!message.suggestedFollowUps || message.suggestedFollowUps.length === 0) return null;
    
    return (
      <div className="message-suggestions">
        {message.suggestedFollowUps.map((suggestion, index) => (
          <button 
            key={index}
            className="suggestion-button"
            onClick={() => onSuggestionClick(suggestion.content)}
          >
            {suggestion.content}
          </button>
        ))}
      </div>
    );
  };
  
  // Render streaming indicator
  const renderStreamingIndicator = () => {
    if (!isStreaming) return null;
    
    return (
      <div className="streaming-indicator">
        <span className="streaming-dot"></span> 
        <span className="streaming-dot"></span> 
        <span className="streaming-dot"></span>
      </div>
    );
  };

  return (
    <div className={`message-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}>
      {!isUser && (
        <div className="message-avatar">
          <div className="avatar-circle">
            {isUser ? '👤' : '🤖'}
          </div>
        </div>
      )}
      
      <div className="message-content">
        <div className="message-text">
          {message.content}
          {renderStreamingIndicator()}
        </div>
        
        {renderImages()}
        {!isUser && renderSuggestions()}
        
        <div className="message-timestamp">
          {message.timestamp}
        </div>
      </div>
    </div>
  );
};

MessageBubble.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    content: PropTypes.string.isRequired,
    timestamp: PropTypes.string.isRequired,
    images: PropTypes.array,
    medias: PropTypes.array,
    suggestedFollowUps: PropTypes.arrayOf(
      PropTypes.shape({
        content: PropTypes.string.isRequired
      })
    ),
  }).isRequired,
  isUser: PropTypes.bool,
  isStreaming: PropTypes.bool,
  onSuggestionClick: PropTypes.func
};

export default MessageBubble;
