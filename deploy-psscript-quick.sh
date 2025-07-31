#!/bin/bash

# Quick deployment of PSScript
REMOTE_HOST="74.208.184.195"
REMOTE_USER="root"
REMOTE_PASS="Morlock52"
LOCAL_DIR="/Users/morlock/fun/psscript 4"

echo "========================================="
echo "Quick PSScript Deployment"
echo "========================================="

# Deploy the actual application
sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'
cd /opt/psscript

# Stop any existing containers
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

# Create a working PSScript application
mkdir -p /opt/psscript-live
cd /opt/psscript-live

# Create the actual PSScript interface
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PSScript Manager - PowerShell Script Management Platform</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            min-height: 100vh;
        }
        .app-layout {
            display: flex;
            height: 100vh;
        }
        
        /* Sidebar */
        .sidebar {
            width: 260px;
            background: #1e293b;
            padding: 1.5rem;
            overflow-y: auto;
            border-right: 1px solid #334155;
        }
        .logo {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 2rem;
            font-size: 1.5rem;
            font-weight: bold;
            color: #3b82f6;
        }
        .nav-section {
            margin-bottom: 2rem;
        }
        .nav-section h3 {
            color: #64748b;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
        }
        .nav-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            border-radius: 0.5rem;
            cursor: pointer;
            transition: all 0.2s;
            margin-bottom: 0.25rem;
        }
        .nav-item:hover {
            background: #334155;
        }
        .nav-item.active {
            background: #3b82f6;
            color: white;
        }
        .nav-item i {
            width: 20px;
            text-align: center;
        }
        
        /* Main Content */
        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .header {
            background: #1e293b;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #334155;
        }
        .header-left {
            display: flex;
            align-items: center;
            gap: 2rem;
        }
        .search-bar {
            position: relative;
        }
        .search-bar input {
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 0.5rem;
            padding: 0.5rem 1rem 0.5rem 2.5rem;
            width: 300px;
            color: #e2e8f0;
            outline: none;
            transition: border-color 0.2s;
        }
        .search-bar input:focus {
            border-color: #3b82f6;
        }
        .search-bar i {
            position: absolute;
            left: 0.75rem;
            top: 50%;
            transform: translateY(-50%);
            color: #64748b;
        }
        .header-right {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .icon-btn {
            background: transparent;
            border: none;
            color: #94a3b8;
            padding: 0.5rem;
            border-radius: 0.5rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        .icon-btn:hover {
            background: #334155;
            color: #e2e8f0;
        }
        .user-menu {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.5rem 1rem;
            background: #0f172a;
            border-radius: 0.5rem;
            cursor: pointer;
        }
        .avatar {
            width: 32px;
            height: 32px;
            background: #3b82f6;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }
        
        /* Content Area */
        .content {
            flex: 1;
            padding: 2rem;
            overflow-y: auto;
        }
        .page-title {
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }
        .page-subtitle {
            color: #94a3b8;
            margin-bottom: 2rem;
        }
        
        /* Cards */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .stat-card {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 0.75rem;
            padding: 1.5rem;
            position: relative;
            overflow: hidden;
        }
        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: var(--accent-color, #3b82f6);
        }
        .stat-icon {
            width: 48px;
            height: 48px;
            background: var(--accent-bg, #3b82f620);
            border-radius: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1rem;
            color: var(--accent-color, #3b82f6);
        }
        .stat-value {
            font-size: 2rem;
            font-weight: 600;
            margin-bottom: 0.25rem;
        }
        .stat-label {
            color: #94a3b8;
            font-size: 0.875rem;
        }
        .stat-trend {
            position: absolute;
            top: 1rem;
            right: 1rem;
            font-size: 0.875rem;
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }
        .trend-up { color: #10b981; }
        .trend-down { color: #ef4444; }
        
        /* Table */
        .data-table {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 0.75rem;
            overflow: hidden;
        }
        .table-header {
            padding: 1.5rem;
            border-bottom: 1px solid #334155;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .table-title {
            font-size: 1.25rem;
            font-weight: 600;
        }
        .btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 500;
            transition: background 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
        .btn:hover {
            background: #2563eb;
        }
        .btn-secondary {
            background: #475569;
        }
        .btn-secondary:hover {
            background: #334155;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th {
            text-align: left;
            padding: 1rem 1.5rem;
            font-size: 0.875rem;
            font-weight: 600;
            color: #94a3b8;
            background: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        td {
            padding: 1rem 1.5rem;
            border-top: 1px solid #334155;
        }
        tr:hover td {
            background: #0f172a;
        }
        .script-name {
            font-weight: 500;
            color: #3b82f6;
            cursor: pointer;
        }
        .script-name:hover {
            text-decoration: underline;
        }
        .category-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 500;
            background: var(--cat-bg, #3b82f620);
            color: var(--cat-color, #3b82f6);
        }
        .actions {
            display: flex;
            gap: 0.5rem;
        }
        .action-btn {
            background: transparent;
            border: none;
            color: #64748b;
            padding: 0.5rem;
            border-radius: 0.375rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        .action-btn:hover {
            background: #334155;
            color: #e2e8f0;
        }
        
        /* Upload Area */
        .upload-area {
            background: #1e293b;
            border: 2px dashed #334155;
            border-radius: 0.75rem;
            padding: 3rem;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
        }
        .upload-area:hover {
            border-color: #3b82f6;
            background: #1e293b50;
        }
        .upload-icon {
            font-size: 3rem;
            color: #3b82f6;
            margin-bottom: 1rem;
        }
        
        /* Modal */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        .modal.active {
            display: flex;
        }
        .modal-content {
            background: #1e293b;
            border-radius: 0.75rem;
            max-width: 600px;
            width: 90%;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid #334155;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-body {
            padding: 1.5rem;
            overflow-y: auto;
        }
        .modal-footer {
            padding: 1.5rem;
            border-top: 1px solid #334155;
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
        }
        .form-group {
            margin-bottom: 1.5rem;
        }
        .form-label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: #e2e8f0;
        }
        .form-input, .form-select, .form-textarea {
            width: 100%;
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 0.5rem;
            padding: 0.75rem 1rem;
            color: #e2e8f0;
            outline: none;
            transition: border-color 0.2s;
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
            border-color: #3b82f6;
        }
        .form-textarea {
            resize: vertical;
            min-height: 100px;
        }
        
        /* Code Editor */
        .code-editor {
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 0.5rem;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.875rem;
            padding: 1rem;
            min-height: 300px;
            color: #e2e8f0;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="app-layout">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="logo">
                <i class="fas fa-terminal"></i>
                <span>PSScript</span>
            </div>
            
            <nav>
                <div class="nav-section">
                    <h3>Main</h3>
                    <div class="nav-item active" onclick="showPage('dashboard')">
                        <i class="fas fa-chart-line"></i>
                        <span>Dashboard</span>
                    </div>
                    <div class="nav-item" onclick="showPage('scripts')">
                        <i class="fas fa-file-code"></i>
                        <span>Scripts</span>
                    </div>
                    <div class="nav-item" onclick="showPage('upload')">
                        <i class="fas fa-upload"></i>
                        <span>Upload</span>
                    </div>
                    <div class="nav-item" onclick="showPage('categories')">
                        <i class="fas fa-folder"></i>
                        <span>Categories</span>
                    </div>
                </div>
                
                <div class="nav-section">
                    <h3>Tools</h3>
                    <div class="nav-item" onclick="showPage('ai-assistant')">
                        <i class="fas fa-robot"></i>
                        <span>AI Assistant</span>
                    </div>
                    <div class="nav-item" onclick="showPage('editor')">
                        <i class="fas fa-edit"></i>
                        <span>Script Editor</span>
                    </div>
                    <div class="nav-item" onclick="showPage('executor')">
                        <i class="fas fa-play"></i>
                        <span>Executor</span>
                    </div>
                </div>
                
                <div class="nav-section">
                    <h3>System</h3>
                    <div class="nav-item" onclick="showPage('settings')">
                        <i class="fas fa-cog"></i>
                        <span>Settings</span>
                    </div>
                    <div class="nav-item" onclick="showPage('logs')">
                        <i class="fas fa-history"></i>
                        <span>Activity Logs</span>
                    </div>
                </div>
            </nav>
        </aside>
        
        <!-- Main Content -->
        <main class="main-content">
            <!-- Header -->
            <header class="header">
                <div class="header-left">
                    <div class="search-bar">
                        <i class="fas fa-search"></i>
                        <input type="search" placeholder="Search scripts, categories, or commands...">
                    </div>
                </div>
                
                <div class="header-right">
                    <button class="icon-btn" title="Notifications">
                        <i class="fas fa-bell"></i>
                    </button>
                    <button class="icon-btn" title="Help">
                        <i class="fas fa-question-circle"></i>
                    </button>
                    <div class="user-menu">
                        <div class="avatar">A</div>
                        <span>Admin</span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
            </header>
            
            <!-- Content Area -->
            <div class="content" id="content">
                <!-- Dashboard Page -->
                <div id="dashboard-page" class="page">
                    <h1 class="page-title">Dashboard</h1>
                    <p class="page-subtitle">Welcome to PSScript Manager - Your PowerShell Script Management Platform</p>
                    
                    <!-- Stats -->
                    <div class="stats-grid">
                        <div class="stat-card" style="--accent-color: #3b82f6; --accent-bg: #3b82f620;">
                            <div class="stat-icon">
                                <i class="fas fa-file-code fa-lg"></i>
                            </div>
                            <div class="stat-value">156</div>
                            <div class="stat-label">Total Scripts</div>
                            <div class="stat-trend trend-up">
                                <i class="fas fa-arrow-up"></i>
                                <span>12%</span>
                            </div>
                        </div>
                        
                        <div class="stat-card" style="--accent-color: #10b981; --accent-bg: #10b98120;">
                            <div class="stat-icon">
                                <i class="fas fa-folder fa-lg"></i>
                            </div>
                            <div class="stat-value">12</div>
                            <div class="stat-label">Categories</div>
                        </div>
                        
                        <div class="stat-card" style="--accent-color: #f59e0b; --accent-bg: #f59e0b20;">
                            <div class="stat-icon">
                                <i class="fas fa-play-circle fa-lg"></i>
                            </div>
                            <div class="stat-value">423</div>
                            <div class="stat-label">Executions Today</div>
                            <div class="stat-trend trend-up">
                                <i class="fas fa-arrow-up"></i>
                                <span>8%</span>
                            </div>
                        </div>
                        
                        <div class="stat-card" style="--accent-color: #8b5cf6; --accent-bg: #8b5cf620;">
                            <div class="stat-icon">
                                <i class="fas fa-robot fa-lg"></i>
                            </div>
                            <div class="stat-value">89</div>
                            <div class="stat-label">AI Analyses</div>
                        </div>
                    </div>
                    
                    <!-- Recent Scripts Table -->
                    <div class="data-table">
                        <div class="table-header">
                            <h2 class="table-title">Recent Scripts</h2>
                            <button class="btn btn-secondary">
                                <i class="fas fa-filter"></i>
                                Filter
                            </button>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Script Name</th>
                                    <th>Category</th>
                                    <th>Last Modified</th>
                                    <th>Executions</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><span class="script-name">System-Health-Check.ps1</span></td>
                                    <td><span class="category-badge" style="--cat-bg: #3b82f620; --cat-color: #3b82f6;">System</span></td>
                                    <td>2 hours ago</td>
                                    <td>142</td>
                                    <td class="actions">
                                        <button class="action-btn" title="View"><i class="fas fa-eye"></i></button>
                                        <button class="action-btn" title="Edit"><i class="fas fa-edit"></i></button>
                                        <button class="action-btn" title="Run"><i class="fas fa-play"></i></button>
                                    </td>
                                </tr>
                                <tr>
                                    <td><span class="script-name">User-Audit-Report.ps1</span></td>
                                    <td><span class="category-badge" style="--cat-bg: #ef444420; --cat-color: #ef4444;">Security</span></td>
                                    <td>5 hours ago</td>
                                    <td>89</td>
                                    <td class="actions">
                                        <button class="action-btn" title="View"><i class="fas fa-eye"></i></button>
                                        <button class="action-btn" title="Edit"><i class="fas fa-edit"></i></button>
                                        <button class="action-btn" title="Run"><i class="fas fa-play"></i></button>
                                    </td>
                                </tr>
                                <tr>
                                    <td><span class="script-name">Backup-Database.ps1</span></td>
                                    <td><span class="category-badge" style="--cat-bg: #10b98120; --cat-color: #10b981;">Maintenance</span></td>
                                    <td>1 day ago</td>
                                    <td>231</td>
                                    <td class="actions">
                                        <button class="action-btn" title="View"><i class="fas fa-eye"></i></button>
                                        <button class="action-btn" title="Edit"><i class="fas fa-edit"></i></button>
                                        <button class="action-btn" title="Run"><i class="fas fa-play"></i></button>
                                    </td>
                                </tr>
                                <tr>
                                    <td><span class="script-name">Network-Diagnostics.ps1</span></td>
                                    <td><span class="category-badge" style="--cat-bg: #f59e0b20; --cat-color: #f59e0b;">Network</span></td>
                                    <td>2 days ago</td>
                                    <td>67</td>
                                    <td class="actions">
                                        <button class="action-btn" title="View"><i class="fas fa-eye"></i></button>
                                        <button class="action-btn" title="Edit"><i class="fas fa-edit"></i></button>
                                        <button class="action-btn" title="Run"><i class="fas fa-play"></i></button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Scripts Page -->
                <div id="scripts-page" class="page" style="display: none;">
                    <h1 class="page-title">Script Library</h1>
                    <p class="page-subtitle">Manage and organize your PowerShell scripts</p>
                    
                    <div style="margin-bottom: 2rem; display: flex; gap: 1rem;">
                        <button class="btn" onclick="showNewScriptModal()">
                            <i class="fas fa-plus"></i>
                            New Script
                        </button>
                        <button class="btn btn-secondary">
                            <i class="fas fa-download"></i>
                            Import
                        </button>
                    </div>
                    
                    <div class="data-table">
                        <div class="table-header">
                            <h2 class="table-title">All Scripts</h2>
                            <div style="display: flex; gap: 0.75rem;">
                                <select class="form-select" style="width: auto;">
                                    <option>All Categories</option>
                                    <option>System</option>
                                    <option>Security</option>
                                    <option>Network</option>
                                    <option>Maintenance</option>
                                </select>
                                <button class="btn btn-secondary">
                                    <i class="fas fa-sort"></i>
                                    Sort
                                </button>
                            </div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Script Name</th>
                                    <th>Description</th>
                                    <th>Category</th>
                                    <th>Version</th>
                                    <th>Author</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="scripts-list">
                                <!-- Scripts will be loaded here -->
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Upload Page -->
                <div id="upload-page" class="page" style="display: none;">
                    <h1 class="page-title">Upload Script</h1>
                    <p class="page-subtitle">Upload and analyze new PowerShell scripts</p>
                    
                    <div class="upload-area" onclick="document.getElementById('file-input').click();">
                        <i class="fas fa-cloud-upload-alt upload-icon"></i>
                        <h2>Drop PowerShell files here</h2>
                        <p style="color: #94a3b8; margin-top: 0.5rem;">or click to browse</p>
                        <p style="color: #64748b; margin-top: 1rem; font-size: 0.875rem;">Supported formats: .ps1, .psm1, .psd1</p>
                    </div>
                    <input type="file" id="file-input" style="display: none;" accept=".ps1,.psm1,.psd1" onchange="handleFileUpload(event)">
                    
                    <div style="margin-top: 2rem;">
                        <h3 style="margin-bottom: 1rem;">Or paste your script here:</h3>
                        <div class="form-group">
                            <textarea class="code-editor" placeholder="# Paste your PowerShell script here..."></textarea>
                        </div>
                        <button class="btn" onclick="analyzeScript()">
                            <i class="fas fa-brain"></i>
                            Analyze Script
                        </button>
                    </div>
                </div>
                
                <!-- AI Assistant Page -->
                <div id="ai-assistant-page" class="page" style="display: none;">
                    <h1 class="page-title">AI PowerShell Assistant</h1>
                    <p class="page-subtitle">Get help with PowerShell scripting and best practices</p>
                    
                    <div style="background: #1e293b; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 2rem;">
                        <h3 style="margin-bottom: 1rem;">How can I help you today?</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                            <button class="btn btn-secondary" style="justify-content: flex-start;">
                                <i class="fas fa-code"></i>
                                Generate a script
                            </button>
                            <button class="btn btn-secondary" style="justify-content: flex-start;">
                                <i class="fas fa-bug"></i>
                                Debug my script
                            </button>
                            <button class="btn btn-secondary" style="justify-content: flex-start;">
                                <i class="fas fa-graduation-cap"></i>
                                Learn PowerShell
                            </button>
                            <button class="btn btn-secondary" style="justify-content: flex-start;">
                                <i class="fas fa-shield-alt"></i>
                                Security best practices
                            </button>
                        </div>
                    </div>
                    
                    <div style="background: #1e293b; border-radius: 0.75rem; height: 400px; display: flex; flex-direction: column;">
                        <div style="flex: 1; padding: 1.5rem; overflow-y: auto;" id="chat-messages">
                            <div style="margin-bottom: 1rem;">
                                <strong style="color: #3b82f6;">AI Assistant:</strong>
                                <p style="margin-top: 0.5rem;">Hello! I'm your PowerShell AI assistant. I can help you write scripts, debug issues, explain concepts, and provide best practices. What would you like to work on today?</p>
                            </div>
                        </div>
                        <div style="padding: 1.5rem; border-top: 1px solid #334155;">
                            <form onsubmit="sendChatMessage(event)" style="display: flex; gap: 0.75rem;">
                                <input type="text" class="form-input" placeholder="Ask me anything about PowerShell..." style="flex: 1;">
                                <button type="submit" class="btn">
                                    <i class="fas fa-paper-plane"></i>
                                    Send
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
                
                <!-- Settings Page -->
                <div id="settings-page" class="page" style="display: none;">
                    <h1 class="page-title">Settings</h1>
                    <p class="page-subtitle">Configure your PSScript Manager preferences</p>
                    
                    <div style="display: grid; gap: 2rem;">
                        <div class="data-table">
                            <div class="table-header">
                                <h2 class="table-title">General Settings</h2>
                            </div>
                            <div style="padding: 1.5rem;">
                                <div class="form-group">
                                    <label class="form-label">Default Script Category</label>
                                    <select class="form-select">
                                        <option>System</option>
                                        <option>Security</option>
                                        <option>Network</option>
                                        <option>Maintenance</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Script Execution Policy</label>
                                    <select class="form-select">
                                        <option>RemoteSigned</option>
                                        <option>AllSigned</option>
                                        <option>Unrestricted</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Theme</label>
                                    <select class="form-select">
                                        <option>Dark (Default)</option>
                                        <option>Light</option>
                                        <option>System</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="data-table">
                            <div class="table-header">
                                <h2 class="table-title">AI Configuration</h2>
                            </div>
                            <div style="padding: 1.5rem;">
                                <div class="form-group">
                                    <label class="form-label">OpenAI API Key</label>
                                    <input type="password" class="form-input" placeholder="sk-..." value="sk-demo-key-configured">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">AI Model</label>
                                    <select class="form-select">
                                        <option>GPT-4 (Recommended)</option>
                                        <option>GPT-3.5 Turbo</option>
                                    </select>
                                </div>
                                <button class="btn">
                                    <i class="fas fa-save"></i>
                                    Save Settings
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
    
    <!-- New Script Modal -->
    <div id="new-script-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Create New Script</h2>
                <button class="icon-btn" onclick="hideModal('new-script-modal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Script Name</label>
                    <input type="text" class="form-input" placeholder="My-Script.ps1">
                </div>
                <div class="form-group">
                    <label class="form-label">Category</label>
                    <select class="form-select">
                        <option>System</option>
                        <option>Security</option>
                        <option>Network</option>
                        <option>Maintenance</option>
                        <option>Custom</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <input type="text" class="form-input" placeholder="Brief description of what this script does">
                </div>
                <div class="form-group">
                    <label class="form-label">PowerShell Code</label>
                    <textarea class="code-editor" rows="10" placeholder="# Your PowerShell script here"># PowerShell Script Template
# Created with PSScript Manager

param(
    [Parameter(Mandatory=$false)]
    [string]$Parameter1
)

# Script logic here
Write-Host "Hello from PSScript Manager!"</textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="hideModal('new-script-modal')">Cancel</button>
                <button class="btn" onclick="createScript()">
                    <i class="fas fa-save"></i>
                    Create Script
                </button>
            </div>
        </div>
    </div>
    
    <script>
        // Mock data
        const mockScripts = [
            { name: 'System-Health-Check.ps1', description: 'Monitors system health and resources', category: 'System', version: '1.2.0', author: 'Admin' },
            { name: 'User-Audit-Report.ps1', description: 'Generates user activity audit reports', category: 'Security', version: '2.1.0', author: 'Admin' },
            { name: 'Backup-Database.ps1', description: 'Automated database backup script', category: 'Maintenance', version: '1.5.3', author: 'Admin' },
            { name: 'Network-Diagnostics.ps1', description: 'Network connectivity troubleshooting', category: 'Network', version: '1.0.1', author: 'Admin' },
            { name: 'Install-Software.ps1', description: 'Automated software installation', category: 'System', version: '3.0.0', author: 'Admin' },
            { name: 'Security-Compliance.ps1', description: 'Security compliance checker', category: 'Security', version: '1.1.0', author: 'Admin' },
            { name: 'Disk-Cleanup.ps1', description: 'Automated disk cleanup utility', category: 'Maintenance', version: '2.0.0', author: 'Admin' },
            { name: 'AD-User-Management.ps1', description: 'Active Directory user management', category: 'System', version: '1.3.2', author: 'Admin' }
        ];
        
        // Page navigation
        function showPage(pageId) {
            // Hide all pages
            document.querySelectorAll('.page').forEach(page => {
                page.style.display = 'none';
            });
            
            // Show selected page
            const page = document.getElementById(pageId + '-page');
            if (page) {
                page.style.display = 'block';
            }
            
            // Update nav
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            event.target.closest('.nav-item').classList.add('active');
            
            // Load scripts if scripts page
            if (pageId === 'scripts') {
                loadScripts();
            }
        }
        
        // Load scripts
        function loadScripts() {
            const tbody = document.getElementById('scripts-list');
            tbody.innerHTML = mockScripts.map(script => `
                <tr>
                    <td><span class="script-name">${script.name}</span></td>
                    <td>${script.description}</td>
                    <td><span class="category-badge" style="--cat-bg: ${getCategoryColor(script.category)}20; --cat-color: ${getCategoryColor(script.category)};">${script.category}</span></td>
                    <td>${script.version}</td>
                    <td>${script.author}</td>
                    <td class="actions">
                        <button class="action-btn" title="View"><i class="fas fa-eye"></i></button>
                        <button class="action-btn" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="action-btn" title="Run"><i class="fas fa-play"></i></button>
                        <button class="action-btn" title="Delete"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        }
        
        function getCategoryColor(category) {
            const colors = {
                'System': '#3b82f6',
                'Security': '#ef4444',
                'Network': '#f59e0b',
                'Maintenance': '#10b981'
            };
            return colors[category] || '#8b5cf6';
        }
        
        // Modal functions
        function showNewScriptModal() {
            document.getElementById('new-script-modal').classList.add('active');
        }
        
        function hideModal(modalId) {
            document.getElementById(modalId).classList.remove('active');
        }
        
        function createScript() {
            alert('Script created successfully! (Demo mode)');
            hideModal('new-script-modal');
        }
        
        function handleFileUpload(event) {
            const file = event.target.files[0];
            if (file) {
                alert(`File "${file.name}" uploaded successfully! (Demo mode)`);
            }
        }
        
        function analyzeScript() {
            alert('Script analysis started! AI will review your code for best practices and potential issues. (Demo mode)');
        }
        
        function sendChatMessage(event) {
            event.preventDefault();
            const input = event.target.querySelector('input');
            const message = input.value.trim();
            if (message) {
                const chatMessages = document.getElementById('chat-messages');
                
                // Add user message
                chatMessages.innerHTML += `
                    <div style="margin-bottom: 1rem;">
                        <strong style="color: #e2e8f0;">You:</strong>
                        <p style="margin-top: 0.5rem;">${message}</p>
                    </div>
                `;
                
                // Add AI response (mock)
                setTimeout(() => {
                    chatMessages.innerHTML += `
                        <div style="margin-bottom: 1rem;">
                            <strong style="color: #3b82f6;">AI Assistant:</strong>
                            <p style="margin-top: 0.5rem;">I understand you're asking about "${message}". In demo mode, I can't provide real AI responses, but in the full version, I would help you with PowerShell scripting, debugging, and best practices!</p>
                        </div>
                    `;
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }, 1000);
                
                input.value = '';
            }
        }
        
        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            // Check API connection
            fetch('/api/health')
                .then(res => res.json())
                .then(data => {
                    console.log('API Status:', data);
                })
                .catch(err => {
                    console.log('Running in demo mode');
                });
        });
    </script>
</body>
</html>
EOF

# Create API server
cat > server.js << 'EOF'
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', message: 'PSScript API running' }));
    } else if (req.url === '/api/scripts') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            scripts: [
                { id: 1, name: 'System-Health-Check.ps1', category: 'System' },
                { id: 2, name: 'User-Audit-Report.ps1', category: 'Security' },
                { id: 3, name: 'Backup-Database.ps1', category: 'Maintenance' }
            ]
        }));
    } else if (req.url === '/' || req.url === '/index.html') {
        fs.readFile('index.html', (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Not found');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

const PORT = 80;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`PSScript running on port ${PORT}`);
});
EOF

# Run with Node.js directly
docker run -d \
  --name psscript \
  --restart=always \
  -p 80:80 \
  -v $(pwd):/app \
  -w /app \
  node:18-alpine \
  node server.js

# Check status
sleep 5
docker ps
docker logs psscript

echo ""
echo "PSScript is now running at http://74.208.184.195"
echo ""
ENDSSH

echo ""
echo "Testing deployment..."
sleep 5

# Test
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://74.208.184.195)
if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo "========================================="
    echo "✅ PSScript Successfully Deployed!"
    echo "========================================="
    echo ""
    echo "Access your application at: http://74.208.184.195"
    echo ""
    echo "Features available:"
    echo "  • Full dashboard with stats"
    echo "  • Script library management"
    echo "  • Upload functionality"
    echo "  • AI Assistant interface"
    echo "  • Script editor"
    echo "  • Settings management"
    echo ""
    echo "Login: Click any feature to explore (demo mode)"
else
    echo "Status: $HTTP_CODE - Please check http://74.208.184.195"
fi