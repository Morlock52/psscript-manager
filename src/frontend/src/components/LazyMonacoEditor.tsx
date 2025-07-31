import React, { lazy, Suspense } from 'react';
import LoadingSpinner from './LoadingSpinner';

// Lazy load Monaco Editor only when needed
const MonacoEditor = lazy(() => import('react-monaco-editor'));

interface LazyMonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: string;
  options?: any;
  height?: string;
  width?: string;
}

const EditorLoadingFallback = () => (
  <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
    <LoadingSpinner message="Loading code editor..." size="large" />
  </div>
);

const LazyMonacoEditor: React.FC<LazyMonacoEditorProps> = (props) => {
  return (
    <Suspense fallback={<EditorLoadingFallback />}>
      <MonacoEditor {...props} />
    </Suspense>
  );
};

export default LazyMonacoEditor;