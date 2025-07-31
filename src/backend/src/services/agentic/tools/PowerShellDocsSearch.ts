import axios from 'axios';

/**
 * Search the PowerShell documentation for relevant information
 * 
 * @param query The search query
 * @returns Relevant documentation as a string
 */
export async function searchPowerShellDocs(query: string): Promise<string> {
  try {
    // Construct a search URL for Microsoft's PowerShell docs
    const searchUrl = `https://learn.microsoft.com/api/search?search=${encodeURIComponent(query)}&locale=en-us&$filter=category eq 'Documentation' and products/any(p: p eq 'PowerShell')`;
    
    const response = await axios.get(searchUrl);
    
    // Process and format the search results
    if (response.data && response.data.results) {
      const results = response.data.results.slice(0, 5); // Take top 5 results
      
      if (results.length === 0) {
        return "No relevant PowerShell documentation found for your query.";
      }
      
      // Format the results
      const formattedResults = results.map((result: any, index: number) => {
        return `
### ${index + 1}. ${result.title}

${result.description || 'No description available.'}

URL: ${result.url}
        `;
      }).join('\n');
      
      return `
# PowerShell Documentation Search Results

Query: "${query}"

${formattedResults}

These results are from the official Microsoft PowerShell documentation.
      `;
    }
    
    return "Failed to retrieve PowerShell documentation.";
  } catch (error) {
    console.error('Error searching PowerShell docs:', error);
    return `Error searching PowerShell documentation: ${error}`;
  }
}
