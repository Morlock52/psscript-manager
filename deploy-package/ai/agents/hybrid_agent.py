"""
Hybrid Agent Implementation

This module implements a hybrid agent that combines the strengths of both 
LangChain and AutoGPT approaches for enhanced script analysis.
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional, Union

# Import base agent classes
from .langchain_agent import LangChainAgent
from .autogpt_agent import AutoGPTAgent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HybridAgent:
    """
    A hybrid agent that combines LangChain and AutoGPT capabilities.
    
    This agent leverages:
    1. LangChain's structured approach and tool integration
    2. AutoGPT's planning and reflection capabilities
    3. Enhanced PowerShell-specific analysis with MS Docs integration
    """
    
    def __init__(self, api_key: Optional[str] = None, model: str = "o3-mini"):
        """
        Initialize the hybrid agent.
        
        Args:
            api_key: The API key to use for OpenAI API calls
            model: The model to use for analysis (default: o3-mini)
        """
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        self.model = model
        
        # Initialize component agents
        self.langchain_agent = LangChainAgent(api_key=self.api_key, model=self.model)
        self.autogpt_agent = AutoGPTAgent(api_key=self.api_key, model=self.model)
        
        logger.info(f"Initialized HybridAgent with model: {self.model}")
    
    async def analyze_script(self, script_id: str, content: str, 
                            include_command_details: bool = False,
                            fetch_ms_docs: bool = False) -> Dict[str, Any]:
        """
        Analyze a PowerShell script using the hybrid approach.
        
        Args:
            script_id: The ID of the script to analyze
            content: The content of the script
            include_command_details: Whether to include detailed command analysis
            fetch_ms_docs: Whether to fetch Microsoft documentation references
            
        Returns:
            A dictionary containing the analysis results
        """
        logger.info(f"Starting hybrid analysis for script {script_id}")
        
        # Step 1: Use LangChain for initial structured analysis
        initial_analysis = await self.langchain_agent.analyze_script(script_id, content)
        
        # Step 2: Use AutoGPT for planning and reflection
        reflection_results = await self.autogpt_agent.reflect_on_script(content, initial_analysis)
        
        # Step 3: Merge the results
        merged_analysis = self._merge_analyses(initial_analysis, reflection_results)
        
        # Step 4: Enhance with command details and MS Docs if requested
        if include_command_details or fetch_ms_docs:
            enhanced_analysis = await self._enhance_analysis(
                content, 
                merged_analysis,
                include_command_details,
                fetch_ms_docs
            )
            merged_analysis = enhanced_analysis
        
        logger.info(f"Completed hybrid analysis for script {script_id}")
        return merged_analysis
    
    async def _enhance_analysis(self, content: str, analysis: Dict[str, Any],
                               include_command_details: bool,
                               fetch_ms_docs: bool) -> Dict[str, Any]:
        """
        Enhance the analysis with command details and MS Docs references.
        
        Args:
            content: The script content
            analysis: The existing analysis
            include_command_details: Whether to include detailed command analysis
            fetch_ms_docs: Whether to fetch Microsoft documentation references
            
        Returns:
            Enhanced analysis dictionary
        """
        enhanced = analysis.copy()
        
        if include_command_details:
            # Extract PowerShell commands and analyze them
            commands = await self._extract_commands(content)
            command_details = await self._analyze_commands(commands)
            enhanced["command_details"] = command_details
        
        if fetch_ms_docs:
            # Fetch Microsoft documentation references
            if include_command_details and "command_details" in enhanced:
                # Use the already extracted commands
                command_names = [cmd["name"] for cmd in enhanced["command_details"]]
            else:
                # Extract command names first
                commands = await self._extract_commands(content)
                command_names = [cmd["name"] for cmd in commands]
            
            ms_docs = await self._fetch_ms_docs(command_names)
            enhanced["ms_docs_references"] = ms_docs
        
        return enhanced
    
    async def _extract_commands(self, content: str) -> List[Dict[str, str]]:
        """
        Extract PowerShell commands from the script content.
        
        Args:
            content: The script content
            
        Returns:
            List of command dictionaries with name and context
        """
        # Use LangChain agent to extract commands
        extraction_prompt = f"""
        Extract all PowerShell commands from the following script. For each command, provide:
        1. The command name (e.g., Get-Process, Set-Location)
        2. The context in which it's used (the line or block containing the command)
        
        Script:
        ```powershell
        {content}
        ```
        
        Return the results as a JSON array of objects with "name" and "context" properties.
        """
        
        extraction_result = await self.langchain_agent.run_custom_prompt(extraction_prompt)
        
        try:
            # Try to parse the JSON response
            commands = json.loads(extraction_result)
            return commands
        except json.JSONDecodeError:
            # If parsing fails, try to extract using a simpler approach
            logger.warning("Failed to parse JSON from command extraction, using fallback method")
            
            # Simple regex-based fallback
            import re
            command_pattern = r'((?:Get|Set|New|Remove|Add|Start|Stop|Import|Export|Install|Uninstall|Invoke|Test|Update|Write|Read|Format|Out|Select|Where|ForEach|Sort|Group|Measure|Compare|Find|Search|Convert|Join|Split|Copy|Move|Rename|Clear|Show|Hide|Enable|Disable|Suspend|Resume|Wait|Watch|Use|Enter|Exit|Push|Pop|Step|Continue|Break|Return|Throw|Try|Catch|Finally|Switch|If|Else|ElseIf|For|While|Do|Until|Begin|Process|End|Param|Function|Filter|Workflow|Configuration|Class|Enum|Interface|Namespace|Module|Assembly|Type|Property|Method|Constructor|Field|Event|Attribute|Variable|Constant|Parameter|Argument|Value|Object|Array|Collection|List|Dictionary|HashTable|Stack|Queue|Set|Map|Tree|Graph|Node|Edge|Vertex|Point|Line|Rectangle|Circle|Ellipse|Polygon|Path|Shape|Color|Font|Brush|Pen|Image|Bitmap|Icon|Cursor|Window|Form|Control|Button|TextBox|Label|CheckBox|RadioButton|ComboBox|ListBox|TreeView|ListView|DataGrid|DataTable|DataSet|DataRow|DataColumn|DataView|DataReader|DataAdapter|Connection|Command|Transaction|Parameter|Reader|Writer|Stream|File|Directory|Path|Uri|Url|WebClient|WebRequest|WebResponse|HttpClient|HttpRequest|HttpResponse|Socket|TcpClient|TcpListener|UdpClient|NetworkStream|IPAddress|IPEndPoint|DNS|Ping|TraceRoute|Telnet|SSH|FTP|SMTP|POP3|IMAP|LDAP|WMI|CIM|COM|DCOM|RPC|XML|JSON|CSV|HTML|CSS|JavaScript|PowerShell|Bash|CMD|SQL|RegEx|DateTime|TimeSpan|Timer|Stopwatch|Thread|Task|Process|Service|EventLog|Registry|Certificate|Credential|Identity|Principal|Role|Permission|Security|Encryption|Decryption|Hash|Signature|Key|Password|Token|Session|Cookie|Cache|Log|Trace|Debug|Info|Warn|Error|Fatal|Exception|Try|Catch|Finally|Throw|Assert|Test|Mock|Stub|Spy|Verify|Expect|Should|Must|Will|Can|May|Is|Are|Was|Were|Has|Have|Had|Do|Does|Did|Can|Could|Will|Would|Shall|Should|May|Might|Must|Need|Dare|Used|Ought|Going|About|To|Be|Being|Been|Am|Is|Are|Was|Were|Not|And|Or|But|If|Then|Else|When|Where|Which|Who|Whom|Whose|What|Whatever|Whenever|Wherever|However|Whichever|Whoever|Whomever|This|That|These|Those|The|A|An|My|Your|His|Her|Its|Our|Their|Mine|Yours|Hers|Ours|Theirs|I|You|He|She|It|We|They|Me|Him|Us|Them|Myself|Yourself|Himself|Herself|Itself|Ourselves|Themselves|Each|Every|All|Any|Some|None|Few|Many|Much|More|Most|Several|Enough|Other|Another|Such|No|Nor|Not|Only|Even|Just|Also|Too|Very|Quite|Rather|Somewhat|Enough|Indeed|Still|Yet|So|Then|Thus|Therefore|Hence|Accordingly|Consequently|As|Since|Because|For|In|On|At|By|With|From|To|Into|Onto|Upon|Within|Without|Throughout|During|Before|After|Above|Below|Over|Under|Between|Among|Through|Across|Along|Around|About|Against|Beside|Besides|Despite|Instead|Of|Like|Unlike|Near|Off|Out|Up|Down|Back|Forward|Away|Together|Apart|Aside|Aback|Aboard|About|Above|Abroad|Across|Afore|After|Against|Ahead|Alongside|Amid|Amidst|Among|Amongst|Anenst|Around|As|Aside|Astride|At|Athwart|Atop|Barring|Before|Behind|Below|Beneath|Beside|Besides|Between|Betwixt|Beyond|But|By|Circa|Concerning|Despite|Down|During|Except|Excluding|Failing|Following|For|From|Given|In|Including|Inside|Into|Lest|Like|Mid|Midst|Minus|Near|Next|Notwithstanding|Of|Off|On|Onto|Opposite|Out|Outside|Over|Pace|Past|Per|Plus|Pro|Qua|Regarding|Round|Sans|Save|Since|Than|Through|Throughout|Till|Times|To|Toward|Towards|Under|Underneath|Unlike|Until|Unto|Up|Upon|Versus|Via|Vice|With|Within|Without|Worth)-[A-Za-z]+)\b'
            
            commands_found = re.findall(command_pattern, content)
            unique_commands = list(set(commands_found))
            
            # Find context for each command
            result = []
            for cmd in unique_commands:
                # Find a line containing this command
                lines = content.split('\n')
                for line in lines:
                    if cmd in line and not line.strip().startswith('#'):
                        result.append({
                            "name": cmd,
                            "context": line.strip()
                        })
                        break
            
            return result
    
    async def _analyze_commands(self, commands: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """
        Analyze PowerShell commands in detail.
        
        Args:
            commands: List of command dictionaries with name and context
            
        Returns:
            List of detailed command analysis dictionaries
        """
        detailed_commands = []
        
        for cmd in commands:
            cmd_name = cmd["name"]
            cmd_context = cmd["context"]
            
            # Use LangChain agent to analyze each command
            analysis_prompt = f"""
            Provide a detailed analysis of the PowerShell command '{cmd_name}' used in this context:
            
            ```powershell
            {cmd_context}
            ```
            
            Include:
            1. A brief description of what the command does
            2. The specific purpose in this context
            3. Common parameters for this command
            4. An example of how it's used in the script
            5. Alternative approaches or modern equivalents if applicable
            6. Any security or performance considerations
            
            Return the results as a JSON object with these properties:
            - name: The command name
            - description: Brief description of the command
            - purpose: The specific purpose in this context
            - parameters: Array of objects with "name" and "description" for common parameters
            - example: Example usage from the script
            - alternatives: Alternative approaches (if applicable)
            - alternativeNote: Note about the alternative (if applicable)
            - securityConsiderations: Security considerations (if applicable)
            - performanceConsiderations: Performance considerations (if applicable)
            - msDocsUrl: URL to Microsoft documentation (if known)
            """
            
            analysis_result = await self.langchain_agent.run_custom_prompt(analysis_prompt)
            
            try:
                # Try to parse the JSON response
                cmd_analysis = json.loads(analysis_result)
                detailed_commands.append(cmd_analysis)
            except json.JSONDecodeError:
                # If parsing fails, create a simplified analysis
                logger.warning(f"Failed to parse JSON for command {cmd_name}, using simplified analysis")
                detailed_commands.append({
                    "name": cmd_name,
                    "description": f"PowerShell command used in the script",
                    "purpose": f"Used in context: {cmd_context}",
                    "example": cmd_context
                })
        
        return detailed_commands
    
    async def _fetch_ms_docs(self, command_names: List[str]) -> List[Dict[str, str]]:
        """
        Fetch Microsoft documentation references for PowerShell commands.
        
        Args:
            command_names: List of PowerShell command names
            
        Returns:
            List of documentation reference dictionaries
        """
        docs_references = []
        
        # Use AutoGPT agent to fetch documentation references
        for cmd_name in command_names:
            docs_prompt = f"""
            Find the Microsoft documentation reference for the PowerShell command '{cmd_name}'.
            
            Return the results as a JSON object with these properties:
            - title: The title of the documentation page
            - url: The URL to the documentation
            - description: A brief description of what the documentation covers
            """
            
            docs_result = await self.autogpt_agent.run_custom_prompt(docs_prompt)
            
            try:
                # Try to parse the JSON response
                doc_ref = json.loads(docs_result)
                docs_references.append(doc_ref)
            except json.JSONDecodeError:
                # If parsing fails, create a simplified reference
                logger.warning(f"Failed to parse JSON for MS Docs reference for {cmd_name}")
                
                # Create a fallback reference with a search URL
                search_url = f"https://learn.microsoft.com/en-us/search/?terms={cmd_name}&scope=PowerShell"
                docs_references.append({
                    "title": f"{cmd_name} Documentation",
                    "url": search_url,
                    "description": f"Microsoft documentation for {cmd_name} PowerShell command"
                })
        
        return docs_references
    
    def _merge_analyses(self, analysis1: Dict[str, Any], analysis2: Dict[str, Any]) -> Dict[str, Any]:
        """
        Merge two analysis dictionaries, preferring values from analysis2 when both exist.
        
        Args:
            analysis1: First analysis dictionary
            analysis2: Second analysis dictionary
            
        Returns:
            Merged analysis dictionary
        """
        merged = analysis1.copy()
        
        for key, value in analysis2.items():
            if key in merged:
                # Special handling for lists - combine them
                if isinstance(value, list) and isinstance(merged[key], list):
                    # Create a set of existing items for O(1) lookup
                    existing_items = set()
                    for item in merged[key]:
                        if isinstance(item, dict):
                            # For dictionaries, use a tuple of items for hashing
                            item_tuple = tuple(sorted(item.items()))
                            existing_items.add(item_tuple)
                        else:
                            # For simple types, add directly
                            existing_items.add(item)
                    
                    # Add new items that don't exist yet
                    for item in value:
                        if isinstance(item, dict):
                            item_tuple = tuple(sorted(item.items()))
                            if item_tuple not in existing_items:
                                merged[key].append(item)
                        else:
                            if item not in existing_items:
                                merged[key].append(item)
                else:
                    # For non-lists, prefer analysis2 values
                    merged[key] = value
            else:
                # Key doesn't exist in merged, add it
                merged[key] = value
        
        return merged
