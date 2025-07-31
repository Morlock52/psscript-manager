/**
 * Script Download Service
 * Provides functions to download PowerShell scripts
 */

/**
 * Downloads a script as a .ps1 file
 * @param scriptContent The content of the script to download
 * @param fileName The name to use for the downloaded file (without extension)
 */
export const downloadScript = (scriptContent: string, fileName: string): void => {
  // Create a blob with the script content
  const blob = new Blob([scriptContent], { type: 'text/plain' });
  
  // Create a temporary URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create an anchor element for downloading
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName.replace(/\s+/g, '_')}.ps1`;
  
  // Append the anchor to the document (required for Firefox)
  document.body.appendChild(a);
  
  // Trigger a click event to start the download
  a.click();
  
  // Clean up
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

/**
 * Downloads a script as a .psm1 module file
 * @param scriptContent The content of the script to download
 * @param fileName The name to use for the downloaded file (without extension)
 */
export const downloadAsModule = (scriptContent: string, fileName: string): void => {
  // Create a blob with the script content
  const blob = new Blob([scriptContent], { type: 'text/plain' });
  
  // Create a temporary URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create an anchor element for downloading
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName.replace(/\s+/g, '_')}.psm1`;
  
  // Append the anchor to the document (required for Firefox)
  document.body.appendChild(a);
  
  // Trigger a click event to start the download
  a.click();
  
  // Clean up
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

/**
 * Downloads multiple scripts as a ZIP file
 * @param scripts Array of script objects with content and title
 * @param zipName Name for the ZIP file
 */
export const downloadMultipleScripts = async (
  scripts: Array<{ content: string; title: string }>,
  zipName: string
): Promise<void> => {
  try {
    // Dynamically import JSZip (to avoid adding it to the main bundle)
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    // Add each script to the ZIP file
    scripts.forEach(script => {
      const fileName = `${script.title.replace(/\s+/g, '_')}.ps1`;
      zip.file(fileName, script.content);
    });
    
    // Generate the ZIP file as a blob
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Create a download link
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${zipName || 'scripts'}.zip`;
    
    // Trigger the download
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error creating ZIP file:', error);
    throw new Error('Failed to create ZIP file for download');
  }
};