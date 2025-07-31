import React from 'react';
import { useNavigate } from 'react-router-dom';

interface DuplicateScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingScriptId?: string;
  existingScriptTitle?: string;
  message?: string;
}

const DuplicateScriptModal: React.FC<DuplicateScriptModalProps> = ({
  isOpen,
  onClose,
  existingScriptId,
  existingScriptTitle,
  message
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleViewExisting = () => {
    if (existingScriptId) {
      navigate(`/scripts/${existingScriptId}`);
    }
    onClose();
  };

  const handleUpdateExisting = () => {
    if (existingScriptId) {
      navigate(`/scripts/${existingScriptId}/edit`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start mb-4">
          <div className="flex-shrink-0 bg-yellow-500 rounded-full p-2">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-lg font-medium text-white">Duplicate Script Detected</h3>
            <div className="mt-2 text-sm text-gray-300">
              <p>{message || 'This script content has already been uploaded.'}</p>
              {existingScriptTitle && (
                <p className="mt-2">
                  <span className="font-semibold">Existing script:</span> {existingScriptTitle}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-400">
          <p>You can:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>View the existing script to see its details</li>
            <li>Update the existing script with new metadata</li>
            <li>Cancel and modify your script to make it unique</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleViewExisting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            View Existing Script
          </button>
          <button
            onClick={handleUpdateExisting}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Update Existing
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateScriptModal;