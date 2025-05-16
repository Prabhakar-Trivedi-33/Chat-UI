import React from 'react';
import ArthChat from './ArthChat';

/**
 * Main App component that loads the chat application
 */
function App() {
  // In a real application, these values would come from your authentication system
  const customerId = "1234"; // Must be a numeric integer as per requirements
  const authToken = "your_auth_token_here"; // Would be from your auth system
  
  return (
    <div className="h-screen bg-gray-100">
      <ArthChat 
        customerId={customerId}
        authToken={authToken}
      />
    </div>
  );
}

export default App;
