import React from 'react';

const Loading: React.FC = () => {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-800">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <h3 className="text-xl font-medium text-gray-200">Loading...</h3>
        <p className="text-gray-400">Please wait while we prepare your content</p>
      </div>
    </div>
  );
};

export default Loading;