// Type definitions for react-markdown
declare module 'react-markdown' {
  import * as React from 'react';

  interface ReactMarkdownProps {
    children: string;
    components?: {
      [nodeType: string]: React.ComponentType<any> | React.FunctionComponent<any>;
    };
    className?: string;
    remarkPlugins?: any[];
    rehypePlugins?: any[];
  }

  const ReactMarkdown: React.FunctionComponent<ReactMarkdownProps>;
  export default ReactMarkdown;
}