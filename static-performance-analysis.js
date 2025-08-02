#!/usr/bin/env node

/**
 * PSScript Static Performance Analysis
 * 
 * Analyzes the codebase for performance issues without running the application
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const RESULTS_DIR = './performance-results';

async function ensureResultsDir() {
  try {
    await fs.mkdir(RESULTS_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating results directory:', err);
  }
}

class StaticPerformanceAnalyzer {
  constructor() {
    this.analysis = {
      frontend: {
        bundleSize: {},
        dependencies: {},
        codeIssues: [],
        optimizationOpportunities: [],
      },
      backend: {
        dependencies: {},
        databaseQueries: [],
        apiEndpoints: [],
        codeIssues: [],
      },
      overall: {
        totalFiles: 0,
        totalLinesOfCode: 0,
        techStack: {},
      },
    };
  }

  async analyzeFrontend() {
    console.log('\n📊 Analyzing Frontend...');
    
    // Analyze package.json dependencies
    const packageJsonPath = path.join(__dirname, 'src/frontend/package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    
    // Count and categorize dependencies
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    let totalDepsSize = 0;
    const depCategories = {
      ui: [],
      dataFetching: [],
      visualization: [],
      utilities: [],
      buildTools: [],
      monitoring: [],
      other: [],
    };

    for (const [dep, version] of Object.entries(deps)) {
      if (dep.includes('mui') || dep.includes('emotion') || dep.includes('lucide')) {
        depCategories.ui.push({ name: dep, version });
      } else if (dep.includes('axios') || dep.includes('tanstack')) {
        depCategories.dataFetching.push({ name: dep, version });
      } else if (dep.includes('chart') || dep.includes('d3')) {
        depCategories.visualization.push({ name: dep, version });
      } else if (dep.includes('vite') || dep.includes('typescript') || dep.includes('eslint')) {
        depCategories.buildTools.push({ name: dep, version });
      } else if (dep.includes('opentelemetry')) {
        depCategories.monitoring.push({ name: dep, version });
      } else if (dep.includes('react') || dep.includes('date-fns') || dep.includes('marked')) {
        depCategories.utilities.push({ name: dep, version });
      } else {
        depCategories.other.push({ name: dep, version });
      }
    }

    this.analysis.frontend.dependencies = {
      total: Object.keys(deps).length,
      categories: depCategories,
      heavyDependencies: [
        { name: '@mui/material', impact: 'Large bundle size (~300KB gzipped)', suggestion: 'Consider tree-shaking or using lighter alternatives' },
        { name: 'monaco-editor', impact: 'Very large (~2MB)', suggestion: 'Lazy load only when needed' },
        { name: 'd3', impact: 'Large library (~100KB)', suggestion: 'Import only needed modules' },
        { name: 'chart.js', impact: 'Moderate size (~60KB)', suggestion: 'Consider lightweight alternatives like uPlot' },
      ],
    };

    // Analyze Vite config for optimization
    const viteConfig = await fs.readFile(path.join(__dirname, 'src/frontend/vite.config.ts'), 'utf8');
    
    this.analysis.frontend.bundleConfig = {
      codeSpittingEnabled: viteConfig.includes('manualChunks'),
      minificationEnabled: viteConfig.includes('minify'),
      treeshakingEnabled: viteConfig.includes('target: \'esnext\''),
      chunks: this.extractChunksFromViteConfig(viteConfig),
    };

    // Analyze source files for common issues
    await this.analyzeFrontendSourceFiles();
  }

  extractChunksFromViteConfig(config) {
    const chunks = [];
    const chunkRegex = /return '([^']+)'/g;
    let match;
    while ((match = chunkRegex.exec(config)) !== null) {
      chunks.push(match[1]);
    }
    return chunks;
  }

  async analyzeFrontendSourceFiles() {
    const srcPath = path.join(__dirname, 'src/frontend/src');
    const issues = [];
    const files = await this.getFilesRecursive(srcPath, ['.tsx', '.ts', '.jsx', '.js']);
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      
      // Check for performance anti-patterns
      if (content.includes('useEffect') && !content.includes('// eslint-disable')) {
        const effectCount = (content.match(/useEffect/g) || []).length;
        if (effectCount > 3) {
          issues.push({
            file: file.replace(__dirname, '.'),
            issue: `Multiple useEffect hooks (${effectCount})`,
            impact: 'Potential unnecessary re-renders',
            suggestion: 'Consider combining effects or using custom hooks',
          });
        }
      }

      // Check for missing React.memo
      if (content.includes('export') && content.includes('function') && !content.includes('memo')) {
        const componentCount = (content.match(/export.*function/g) || []).length;
        if (componentCount > 0 && file.includes('components')) {
          issues.push({
            file: file.replace(__dirname, '.'),
            issue: 'Component not memoized',
            impact: 'Unnecessary re-renders',
            suggestion: 'Consider using React.memo for pure components',
          });
        }
      }

      // Check for inline functions in render
      if (content.includes('onClick={() =>') || content.includes('onChange={() =>')) {
        issues.push({
          file: file.replace(__dirname, '.'),
          issue: 'Inline function in render',
          impact: 'Creates new function on every render',
          suggestion: 'Use useCallback or extract to stable function',
        });
      }

      // Check for large component files
      const lines = content.split('\n').length;
      if (lines > 300) {
        issues.push({
          file: file.replace(__dirname, '.'),
          issue: `Large component file (${lines} lines)`,
          impact: 'Hard to maintain, potentially doing too much',
          suggestion: 'Consider splitting into smaller components',
        });
      }
    }

    this.analysis.frontend.codeIssues = issues;
  }

  async analyzeBackend() {
    console.log('\n🚀 Analyzing Backend...');
    
    // Analyze package.json
    const packageJsonPath = path.join(__dirname, 'src/backend/package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    
    // Categorize backend dependencies
    const deps = { ...packageJson.dependencies };
    const depCategories = {
      database: [],
      authentication: [],
      monitoring: [],
      api: [],
      utilities: [],
    };

    for (const [dep, version] of Object.entries(deps)) {
      if (dep.includes('pg') || dep.includes('sequelize') || dep.includes('redis')) {
        depCategories.database.push({ name: dep, version });
      } else if (dep.includes('passport') || dep.includes('jwt') || dep.includes('bcrypt')) {
        depCategories.authentication.push({ name: dep, version });
      } else if (dep.includes('opentelemetry') || dep.includes('winston') || dep.includes('prom-client')) {
        depCategories.monitoring.push({ name: dep, version });
      } else if (dep.includes('express') || dep.includes('cors') || dep.includes('helmet')) {
        depCategories.api.push({ name: dep, version });
      } else {
        depCategories.utilities.push({ name: dep, version });
      }
    }

    this.analysis.backend.dependencies = {
      total: Object.keys(deps).length,
      categories: depCategories,
      performanceConcerns: [
        { dependency: 'sequelize', concern: 'ORM overhead', suggestion: 'Use raw queries for performance-critical paths' },
        { dependency: 'bcrypt', concern: 'CPU-intensive', suggestion: 'Consider using worker threads for hashing' },
        { dependency: 'multiple auth strategies', concern: 'Memory overhead', suggestion: 'Lazy load auth strategies' },
      ],
    };

    // Analyze backend source files
    await this.analyzeBackendSourceFiles();
  }

  async analyzeBackendSourceFiles() {
    const srcPath = path.join(__dirname, 'src/backend/src');
    const issues = [];
    const endpoints = [];
    const queries = [];
    
    const files = await this.getFilesRecursive(srcPath, ['.ts', '.js']);
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      
      // Find API endpoints
      const routeMatches = content.matchAll(/router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)/g);
      for (const match of routeMatches) {
        endpoints.push({
          method: match[1].toUpperCase(),
          path: match[2],
          file: file.replace(__dirname, '.'),
        });
      }

      // Check for N+1 query patterns
      if (content.includes('findAll') || content.includes('findMany')) {
        if (content.includes('for') || content.includes('map')) {
          issues.push({
            file: file.replace(__dirname, '.'),
            issue: 'Potential N+1 query pattern',
            impact: 'Database performance degradation',
            suggestion: 'Use includes/joins or batch queries',
          });
        }
      }

      // Check for missing pagination
      if (content.includes('findAll') && !content.includes('limit') && !content.includes('offset')) {
        issues.push({
          file: file.replace(__dirname, '.'),
          issue: 'Missing pagination',
          impact: 'Could return large datasets',
          suggestion: 'Implement pagination with limit/offset',
        });
      }

      // Check for synchronous operations
      if (content.includes('readFileSync') || content.includes('execSync')) {
        issues.push({
          file: file.replace(__dirname, '.'),
          issue: 'Synchronous I/O operation',
          impact: 'Blocks event loop',
          suggestion: 'Use async alternatives',
        });
      }

      // Check for missing caching
      if (file.includes('controller') && !content.includes('cache') && !content.includes('Cache')) {
        issues.push({
          file: file.replace(__dirname, '.'),
          issue: 'No caching implementation',
          impact: 'Repeated expensive operations',
          suggestion: 'Implement Redis caching for frequently accessed data',
        });
      }

      // Check for missing indexes hint
      if (content.includes('where:') && (content.includes('email') || content.includes('username'))) {
        queries.push({
          file: file.replace(__dirname, '.'),
          query: 'Query on email/username field',
          suggestion: 'Ensure database index exists',
        });
      }
    }

    this.analysis.backend.codeIssues = issues;
    this.analysis.backend.apiEndpoints = endpoints;
    this.analysis.backend.databaseQueries = queries;
  }

  async getFilesRecursive(dir, extensions) {
    const files = [];
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory() && !item.name.includes('node_modules') && !item.name.startsWith('.')) {
        files.push(...await this.getFilesRecursive(fullPath, extensions));
      } else if (item.isFile() && extensions.some(ext => item.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  async analyzeBuildSize() {
    console.log('\n📦 Analyzing Build Sizes...');
    
    try {
      // Check if frontend is built
      const distPath = path.join(__dirname, 'src/frontend/dist');
      const distExists = await fs.access(distPath).then(() => true).catch(() => false);
      
      if (!distExists) {
        console.log('Frontend not built. Building now...');
        execSync('cd src/frontend && npm run build', { stdio: 'inherit' });
      }

      // Analyze dist folder
      const files = await this.getFilesRecursive(distPath, ['.js', '.css']);
      const bundles = {};
      let totalSize = 0;

      for (const file of files) {
        const stats = await fs.stat(file);
        const relativePath = file.replace(distPath, '');
        const sizeKB = (stats.size / 1024).toFixed(2);
        
        let category = 'other';
        if (relativePath.includes('vendor')) category = 'vendor';
        else if (relativePath.includes('index')) category = 'main';
        else if (relativePath.endsWith('.css')) category = 'styles';
        
        if (!bundles[category]) bundles[category] = [];
        bundles[category].push({ file: relativePath, size: sizeKB + ' KB' });
        totalSize += stats.size;
      }

      this.analysis.frontend.bundleSize = {
        bundles,
        totalSize: (totalSize / 1024).toFixed(2) + ' KB',
        totalSizeMB: (totalSize / 1048576).toFixed(2) + ' MB',
      };
    } catch (err) {
      console.error('Error analyzing build size:', err.message);
      this.analysis.frontend.bundleSize = { error: 'Build analysis failed' };
    }
  }

  generateOptimizationRecommendations() {
    const recommendations = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
    };

    // Frontend recommendations
    if (this.analysis.frontend.dependencies.heavyDependencies.length > 0) {
      recommendations.immediate.push({
        area: 'Frontend Dependencies',
        action: 'Optimize heavy dependencies',
        details: this.analysis.frontend.dependencies.heavyDependencies.map(d => `${d.name}: ${d.suggestion}`),
        estimatedImpact: '30-50% bundle size reduction',
      });
    }

    if (this.analysis.frontend.codeIssues.length > 5) {
      recommendations.immediate.push({
        area: 'Frontend Code',
        action: 'Fix React performance anti-patterns',
        details: `${this.analysis.frontend.codeIssues.length} issues found`,
        estimatedImpact: '20-30% render performance improvement',
      });
    }

    // Backend recommendations
    const n1Issues = this.analysis.backend.codeIssues.filter(i => i.issue.includes('N+1'));
    if (n1Issues.length > 0) {
      recommendations.immediate.push({
        area: 'Backend Queries',
        action: 'Fix N+1 query patterns',
        details: `${n1Issues.length} potential N+1 queries found`,
        estimatedImpact: '50-90% query time reduction',
      });
    }

    const cacheIssues = this.analysis.backend.codeIssues.filter(i => i.issue.includes('caching'));
    if (cacheIssues.length > 3) {
      recommendations.shortTerm.push({
        area: 'Backend Caching',
        action: 'Implement comprehensive caching strategy',
        details: `${cacheIssues.length} controllers without caching`,
        estimatedImpact: '60-80% response time improvement for cached endpoints',
      });
    }

    // Long-term architectural recommendations
    if (this.analysis.frontend.bundleSize.totalSizeMB && parseFloat(this.analysis.frontend.bundleSize.totalSizeMB) > 2) {
      recommendations.longTerm.push({
        area: 'Architecture',
        action: 'Implement micro-frontend architecture',
        details: 'Current bundle size exceeds 2MB',
        estimatedImpact: 'Enable independent deployment and better caching',
      });
    }

    return recommendations;
  }

  async generateReport() {
    console.log('\n📝 Generating Static Analysis Report...');
    
    const recommendations = this.generateOptimizationRecommendations();
    
    const report = {
      timestamp: new Date().toISOString(),
      analysis: this.analysis,
      recommendations,
      summary: {
        frontendIssues: this.analysis.frontend.codeIssues.length,
        backendIssues: this.analysis.backend.codeIssues.length,
        totalDependencies: this.analysis.frontend.dependencies.total + this.analysis.backend.dependencies.total,
        criticalFindings: [
          ...this.analysis.frontend.codeIssues.filter(i => i.impact.includes('performance')),
          ...this.analysis.backend.codeIssues.filter(i => i.issue.includes('N+1') || i.issue.includes('Synchronous')),
        ],
      },
    };

    const reportPath = path.join(RESULTS_DIR, `static-analysis-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = path.join(RESULTS_DIR, `static-analysis-${Date.now()}.md`);
    await fs.writeFile(markdownPath, markdownReport);

    console.log(`\n✅ Reports saved to:`);
    console.log(`   - JSON: ${reportPath}`);
    console.log(`   - Markdown: ${markdownPath}`);

    return report;
  }

  generateMarkdownReport(report) {
    return `# PSScript Static Performance Analysis

**Date**: ${new Date(report.timestamp).toLocaleString()}

## Executive Summary

- **Frontend Issues Found**: ${report.summary.frontendIssues}
- **Backend Issues Found**: ${report.summary.backendIssues}
- **Total Dependencies**: ${report.summary.totalDependencies}
- **Critical Performance Issues**: ${report.summary.criticalFindings.length}

## Frontend Analysis

### Dependencies (${report.analysis.frontend.dependencies.total} total)

#### Heavy Dependencies
${report.analysis.frontend.dependencies.heavyDependencies.map(d => `- **${d.name}**: ${d.impact}
  - Suggestion: ${d.suggestion}`).join('\n')}

#### Bundle Configuration
- Code Splitting: ${report.analysis.frontend.bundleConfig?.codeSpittingEnabled ? '✅ Enabled' : '❌ Disabled'}
- Minification: ${report.analysis.frontend.bundleConfig?.minificationEnabled ? '✅ Enabled' : '❌ Disabled'}
- Tree Shaking: ${report.analysis.frontend.bundleConfig?.treeshakingEnabled ? '✅ Enabled' : '❌ Disabled'}
- Chunks: ${report.analysis.frontend.bundleConfig?.chunks.join(', ') || 'None'}

### Code Issues (${report.analysis.frontend.codeIssues.length} found)

${report.analysis.frontend.codeIssues.slice(0, 10).map(issue => `
#### ${issue.file}
- **Issue**: ${issue.issue}
- **Impact**: ${issue.impact}
- **Suggestion**: ${issue.suggestion}
`).join('\n')}

${report.analysis.frontend.codeIssues.length > 10 ? `\n... and ${report.analysis.frontend.codeIssues.length - 10} more issues` : ''}

## Backend Analysis

### Dependencies (${report.analysis.backend.dependencies.total} total)

#### Performance Concerns
${report.analysis.backend.dependencies.performanceConcerns.map(c => `- **${c.dependency}**: ${c.concern}
  - Suggestion: ${c.suggestion}`).join('\n')}

### API Endpoints (${report.analysis.backend.apiEndpoints.length} found)
${report.analysis.backend.apiEndpoints.slice(0, 10).map(e => `- ${e.method} ${e.path} (${e.file})`).join('\n')}

### Code Issues (${report.analysis.backend.codeIssues.length} found)

${report.analysis.backend.codeIssues.slice(0, 10).map(issue => `
#### ${issue.file}
- **Issue**: ${issue.issue}
- **Impact**: ${issue.impact}
- **Suggestion**: ${issue.suggestion}
`).join('\n')}

## Optimization Recommendations

### Immediate Actions (High Priority)
${report.recommendations.immediate.map(rec => `
#### ${rec.area}: ${rec.action}
- **Details**: ${Array.isArray(rec.details) ? rec.details.join(', ') : rec.details}
- **Estimated Impact**: ${rec.estimatedImpact}
`).join('\n')}

### Short-term Improvements (Medium Priority)
${report.recommendations.shortTerm.map(rec => `
#### ${rec.area}: ${rec.action}
- **Details**: ${rec.details}
- **Estimated Impact**: ${rec.estimatedImpact}
`).join('\n')}

### Long-term Strategy (Low Priority)
${report.recommendations.longTerm.map(rec => `
#### ${rec.area}: ${rec.action}
- **Details**: ${rec.details}
- **Estimated Impact**: ${rec.estimatedImpact}
`).join('\n')}

## Performance Checklist

### Frontend
- [ ] Remove or lazy-load heavy dependencies
- [ ] Implement React.memo for pure components
- [ ] Replace inline functions with useCallback
- [ ] Split large components
- [ ] Enable all build optimizations
- [ ] Implement route-based code splitting

### Backend
- [ ] Fix N+1 query patterns
- [ ] Add database indexes
- [ ] Implement caching layer
- [ ] Replace synchronous I/O
- [ ] Add pagination to list endpoints
- [ ] Optimize ORM queries

### Infrastructure
- [ ] Enable gzip/brotli compression
- [ ] Configure CDN for static assets
- [ ] Set up performance monitoring
- [ ] Implement rate limiting
- [ ] Configure database connection pooling
`;
  }
}

async function runStaticAnalysis() {
  console.log('🔍 PSScript Static Performance Analysis');
  console.log('======================================\n');

  await ensureResultsDir();

  const analyzer = new StaticPerformanceAnalyzer();

  try {
    await analyzer.analyzeFrontend();
    await analyzer.analyzeBackend();
    await analyzer.analyzeBuildSize();
    
    const report = await analyzer.generateReport();

    console.log('\n\n========== ANALYSIS SUMMARY ==========\n');
    console.log(`Frontend Issues: ${report.summary.frontendIssues}`);
    console.log(`Backend Issues: ${report.summary.backendIssues}`);
    console.log(`Critical Findings: ${report.summary.criticalFindings.length}`);
    
    if (report.summary.criticalFindings.length > 0) {
      console.log('\n⚠️  Critical Performance Issues:');
      report.summary.criticalFindings.slice(0, 5).forEach(issue => {
        console.log(`  - [${issue.file}] ${issue.issue}`);
      });
    }

    console.log('\n✅ Static analysis complete! Check the results directory for detailed reports.');

  } catch (err) {
    console.error('\n❌ Analysis failed:', err);
  }
}

if (require.main === module) {
  runStaticAnalysis().catch(console.error);
}

module.exports = { StaticPerformanceAnalyzer, runStaticAnalysis };