import React, { useEffect, useRef } from 'react';
import MonacoEditor from 'react-monaco-editor';
import './CodeEditor.css';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string | number;
  readOnly?: boolean;
}

/**
 * CodeEditor component for editing code with syntax highlighting
 * Uses Monaco Editor under the hood for advanced editing features
 */
const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'powershell',
  height = '500px',
  readOnly = false
}) => {
  // Editor options
  const editorOptions = {
    selectOnLineNumbers: true,
    roundedSelection: true,
    readOnly: readOnly,
    cursorStyle: 'line' as const, // Type assertion to valid cursorStyle
    automaticLayout: true,
    minimap: {
      enabled: true
    },
    scrollBeyondLastLine: false,
    wordWrap: 'on' as const,
    lineNumbers: 'on' as const,
    folding: true,
    fontSize: 14
  };

  // Handle editor mount
  const handleEditorDidMount = (editor: any) => {
    editor.focus();
    
    // Add Powershell specific configuration if needed
    if (language === 'powershell') {
      // Monaco has built-in PowerShell support
      // This is where we could add any custom PowerShell configurations
    }
  };

  // Create a reference to the container element
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Set the height using a CSS custom property
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.setProperty(
        '--editor-height', 
        typeof height === 'string' ? height : `${height}px`
      );
    }
  }, [height]);

  return (
    <div className="code-editor-container" ref={containerRef}>
      <MonacoEditor
        width="100%"
        height="100%"
        language={language}
        theme="vs-dark"
        value={value}
        options={editorOptions}
        onChange={onChange}
        editorDidMount={handleEditorDidMount}
      />
    </div>
  );
};

export default CodeEditor;
