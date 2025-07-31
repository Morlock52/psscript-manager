import React, { useState, useRef, useEffect } from 'react';
import LazyMonacoEditor from './LazyMonacoEditor';

interface FullScreenEditorProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent: string;
  onSave: (content: string) => void;
  title?: string;
  scriptName?: string;
}

const FullScreenEditor: React.FC<FullScreenEditorProps> = ({
  isOpen,
  onClose,
  initialContent,
  onSave,
  title = 'Edit Script',
  scriptName = ''
}) => {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [showEditInfo, setShowEditInfo] = useState(false);
  const editorRef = useRef<any>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set initial content when the editor opens
    setContent(initialContent);
    
    // Handle escape key to close the editor
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    // Handle save shortcut (Ctrl+S or Cmd+S)
    const handleSaveShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', handleSaveShortcut);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleSaveShortcut);
    };
  }, [isOpen, initialContent, onClose, content]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSave = () => {
    setIsSaving(true);
    
    try {
      onSave(content);
      // Simulate a brief saving animation
      setTimeout(() => {
        setIsSaving(false);
        // Show saved message briefly
        setShowEditInfo(true);
        setTimeout(() => setShowEditInfo(false), 2000);
      }, 500);
    } catch (error) {
      console.error('Error saving script:', error);
      setIsSaving(false);
    }
  };

  // Define Monaco type
  interface Monaco {
    KeyMod: any;
    KeyCode: any;
  }
  
  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
    editor.focus();
    
    // Add editor formatting commands if Monaco is available
    try {
      // Use window object to check if monaco is defined
      const monacoInstance = (window as any).monaco;
      if (monacoInstance) {
        editor.addAction({
          id: 'format-document',
          label: 'Format Document',
          keybindings: [
            monacoInstance.KeyMod.Alt | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyF
          ],
          run: function(editor: any) {
            editor.getAction('editor.action.formatDocument').run();
          }
        });
      }
    } catch (error) {
      console.warn('Monaco editor formatting not available:', error);
    }
  };

  // Define editor options with proper typing
  const editorOptions: any = {
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly: false,
    cursorStyle: 'line',
    automaticLayout: true,
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    contextmenu: true,
    fontFamily: 'Consolas, "Courier New", monospace',
    fontSize: 14,
    lineNumbers: 'on', // This should be 'on' | 'off' | 'relative' but using string for compatibility
    wordWrap: 'on',
    quickSuggestions: true,
    snippetSuggestions: 'inline',
    formatOnPaste: true,
    formatOnType: true,
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
      <div 
        ref={modalRef}
        className="bg-gray-800 rounded-lg shadow-xl w-11/12 h-5/6 flex flex-col"
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            {scriptName && (
              <span className="ml-2 text-gray-400 text-sm">
                {scriptName}
              </span>
            )}
            {showEditInfo && (
              <span className="ml-3 text-green-400 text-sm bg-green-900 px-2 py-1 rounded animate-pulse">
                Saved successfully!
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className={`px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
            >
              Cancel
            </button>
          </div>
        </div>
        
        <div className="flex-grow overflow-hidden">
          <LazyMonacoEditor
            language="powershell"
            theme="vs-dark"
            value={content}
            options={editorOptions}
            onChange={setContent}
            height="100%"
            width="100%"
          />
        </div>
        
        <div className="p-2 border-t border-gray-700 bg-gray-900 text-xs text-gray-400 flex justify-between">
          <div>
            Press <kbd className="px-1 py-0.5 bg-gray-700 rounded">Ctrl+S</kbd> or <kbd className="px-1 py-0.5 bg-gray-700 rounded">⌘+S</kbd> to save
          </div>
          <div>
            <span className="mr-4">
              <kbd className="px-1 py-0.5 bg-gray-700 rounded">Alt+Shift+F</kbd> Format
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-gray-700 rounded">Esc</kbd> Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullScreenEditor;