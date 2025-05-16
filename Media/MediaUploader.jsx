import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './MediaUploader.css';

/**
 * Component for handling multiple image uploads with preview
 */
const MediaUploader = ({ onImagesSelected, onCancel }) => {
  const [selectedImages, setSelectedImages] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  
  // Refs
  const fileInputRef = React.useRef(null);
  
  // Handle file selection from file input
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      setSelectedImages(prev => [...prev, ...files]);
    }
  };
  
  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  // Handle file drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
      if (files.length > 0) {
        setSelectedImages(prev => [...prev, ...files]);
      }
    }
  };
  
  // Trigger file input click
  const handleButtonClick = () => {
    fileInputRef.current.click();
  };
  
  // Remove an image from selection
  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };
  
  // Handle upload
  const handleUpload = () => {
    if (selectedImages.length > 0) {
      onImagesSelected(selectedImages);
    }
  };
  
  return (
    <div className="media-uploader-container">
      <div className="media-uploader-header">
        <h3>Upload Portfolio Images</h3>
        <button className="close-button" onClick={onCancel}>×</button>
      </div>
      
      <div 
        className={`drop-area ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          accept="image/*" 
          multiple 
          style={{ display: 'none' }} 
        />
        
        <div className="drop-area-content">
          <div className="upload-icon">📁</div>
          <p>Drag and drop your portfolio images here</p>
          <p className="or-text">or</p>
          <button 
            className="browse-button"
            onClick={handleButtonClick}
          >
            Browse Files
          </button>
        </div>
      </div>
      
      {selectedImages.length > 0 && (
        <div className="selected-images-container">
          <h4>Selected Images ({selectedImages.length})</h4>
          <div className="image-grid">
            {selectedImages.map((image, index) => (
              <div key={index} className="image-item">
                <img 
                  src={URL.createObjectURL(image)} 
                  alt={`Selected ${index}`} 
                />
                <div className="image-item-overlay">
                  <button 
                    className="remove-button"
                    onClick={() => removeImage(index)}
                  >
                    ×
                  </button>
                </div>
                <div className="image-name">{image.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="action-buttons">
        <button 
          className="cancel-button"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button 
          className="upload-button"
          onClick={handleUpload}
          disabled={selectedImages.length === 0}
        >
          Upload {selectedImages.length > 0 ? `(${selectedImages.length})` : ''}
        </button>
      </div>
    </div>
  );
};

MediaUploader.propTypes = {
  onImagesSelected: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default MediaUploader;
