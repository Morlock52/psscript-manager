import React, { useState, useEffect } from 'react';
import { importSyntaxHighlighter } from '../utils/dynamicImports';
import LoadingSpinner from './LoadingSpinner';

interface LazySyntaxHighlighterProps {
  children: string;
  language: string;
  style?: any;
  showLineNumbers?: boolean;
  customStyle?: React.CSSProperties;
}

const LazySyntaxHighlighter: React.FC<LazySyntaxHighlighterProps> = ({
  children,
  language,
  style,
  showLineNumbers = false,
  customStyle
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [SyntaxHighlighter, setSyntaxHighlighter] = useState<any>(null);
  const [highlighterStyle, setHighlighterStyle] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    const loadHighlighter = async () => {
      try {
        const { SyntaxHighlighter: Highlighter, tomorrow } = await importSyntaxHighlighter();
        
        if (mounted) {
          setSyntaxHighlighter(() => Highlighter);
          setHighlighterStyle(style || tomorrow);
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load syntax highlighter:', error);
      }
    };

    loadHighlighter();

    return () => {
      mounted = false;
    };
  }, [style]);

  if (!isLoaded || !SyntaxHighlighter) {
    return (
      <div className="relative bg-gray-100 rounded-lg p-4 min-h-[100px]">
        <LoadingSpinner size="small" message="Loading syntax highlighter..." />
        {/* Show raw code as fallback */}
        <pre className="mt-4 text-sm text-gray-600 overflow-x-auto">
          <code>{children}</code>
        </pre>
      </div>
    );
  }

  return (
    <SyntaxHighlighter
      language={language}
      style={highlighterStyle}
      showLineNumbers={showLineNumbers}
      customStyle={{
        borderRadius: '0.5rem',
        padding: '1rem',
        fontSize: '0.875rem',
        ...customStyle
      }}
    >
      {children}
    </SyntaxHighlighter>
  );
};

export default LazySyntaxHighlighter;