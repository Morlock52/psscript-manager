#!/usr/bin/env node

/**
 * PSScript Performance Benchmarking Suite
 * 
 * Comprehensive performance analysis covering:
 * - Frontend load times and Core Web Vitals
 * - Backend API response times
 * - Database query performance
 * - Bundle size analysis
 * - Memory usage patterns
 * - CPU utilization under load
 * - Network waterfall analysis
 * - Caching effectiveness
 * - Resource optimization opportunities
 * - Scalability limits
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3002',
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3004',
  RESULTS_DIR: './performance-results',
  LOAD_TEST_DURATION: 30, // seconds
  CONCURRENT_USERS: [1, 10, 50, 100], // for scalability testing
};

// Ensure results directory exists
async function ensureResultsDir() {
  try {
    await fs.mkdir(CONFIG.RESULTS_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating results directory:', err);
  }
}

// Performance Metrics Collection
class PerformanceMetrics {
  constructor() {
    this.metrics = {
      frontend: {
        coreWebVitals: {},
        resourceTiming: [],
        navigationTiming: {},
        bundleSizes: {},
        memoryUsage: {},
      },
      backend: {
        apiResponseTimes: {},
        databaseQueryTimes: [],
        throughput: {},
        errorRates: {},
      },
      system: {
        cpuUsage: [],
        memoryUsage: [],
        networkLatency: [],
      },
      cache: {
        hitRate: 0,
        missRate: 0,
        responseTimeImprovement: 0,
      },
      scalability: {
        responseTimeByLoad: {},
        throughputByLoad: {},
        errorRateByLoad: {},
      },
    };
  }

  async collectFrontendMetrics(browser) {
    console.log('\n📊 Collecting Frontend Metrics...');
    
    const page = await browser.newPage();
    
    // Enable performance monitoring
    await page.evaluateOnNewDocument(() => {
      window.performanceMetrics = {
        navigationStart: 0,
        resources: [],
        measures: [],
      };

      // Capture navigation timing
      window.addEventListener('load', () => {
        window.performanceMetrics.navigationTiming = performance.getEntriesByType('navigation')[0];
      });

      // Capture resource timing
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            window.performanceMetrics.resources.push({
              name: entry.name,
              type: entry.initiatorType,
              duration: entry.duration,
              size: entry.transferSize,
            });
          } else if (entry.entryType === 'measure') {
            window.performanceMetrics.measures.push({
              name: entry.name,
              duration: entry.duration,
            });
          }
        }
      });
      observer.observe({ entryTypes: ['resource', 'measure'] });
    });

    // Navigate to the application
    await page.goto(CONFIG.FRONTEND_URL, { waitUntil: 'networkidle0' });

    // Collect Core Web Vitals
    const coreWebVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        let lcp = 0;
        let fid = 0;
        let cls = 0;
        let fcp = 0;
        let ttfb = 0;

        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          lcp = lastEntry.renderTime || lastEntry.loadTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            fid = entry.processingStart - entry.startTime;
          });
        }).observe({ type: 'first-input', buffered: true });

        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            if (!entry.hadRecentInput) {
              cls += entry.value;
            }
          });
        }).observe({ type: 'layout-shift', buffered: true });

        // Get FCP and TTFB
        const paintEntries = performance.getEntriesByType('paint');
        paintEntries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            fcp = entry.startTime;
          }
        });

        const navigation = performance.getEntriesByType('navigation')[0];
        ttfb = navigation.responseStart - navigation.requestStart;

        setTimeout(() => {
          resolve({ lcp, fid, cls, fcp, ttfb });
        }, 5000);
      });
    });

    this.metrics.frontend.coreWebVitals = coreWebVitals;

    // Collect performance metrics
    const performanceData = await page.evaluate(() => window.performanceMetrics);
    this.metrics.frontend.navigationTiming = performanceData.navigationTiming;
    this.metrics.frontend.resourceTiming = performanceData.resources;

    // Memory usage
    const memoryUsage = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
          totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
          jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB',
        };
      }
      return null;
    });

    this.metrics.frontend.memoryUsage = memoryUsage;

    await page.close();
  }

  async collectBundleSizes() {
    console.log('\n📦 Analyzing Bundle Sizes...');
    
    try {
      const distPath = path.join(__dirname, 'src/frontend/dist');
      const files = await fs.readdir(distPath, { recursive: true });
      
      const bundles = {};
      let totalSize = 0;

      for (const file of files) {
        if (file.endsWith('.js') || file.endsWith('.css')) {
          const filePath = path.join(distPath, file);
          const stats = await fs.stat(filePath);
          const sizeInKB = (stats.size / 1024).toFixed(2);
          
          // Categorize bundles
          let category = 'other';
          if (file.includes('react-vendor')) category = 'react-vendor';
          else if (file.includes('router')) category = 'router';
          else if (file.includes('data-fetching')) category = 'data-fetching';
          else if (file.includes('visualization')) category = 'visualization';
          else if (file.includes('editor')) category = 'editor';
          else if (file.includes('index')) category = 'main';
          else if (file.endsWith('.css')) category = 'styles';

          if (!bundles[category]) bundles[category] = { files: [], totalSize: 0 };
          bundles[category].files.push({ name: file, size: sizeInKB + ' KB' });
          bundles[category].totalSize += parseFloat(sizeInKB);
          totalSize += stats.size;
        }
      }

      // Calculate totals
      for (const category in bundles) {
        bundles[category].totalSize = bundles[category].totalSize.toFixed(2) + ' KB';
      }

      this.metrics.frontend.bundleSizes = {
        bundles,
        totalSize: (totalSize / 1024).toFixed(2) + ' KB',
        totalSizeMB: (totalSize / 1048576).toFixed(2) + ' MB',
      };
    } catch (err) {
      console.error('Error analyzing bundle sizes:', err.message);
      this.metrics.frontend.bundleSizes = { error: err.message };
    }
  }

  async collectBackendMetrics() {
    console.log('\n🚀 Testing Backend API Performance...');
    
    const endpoints = [
      { path: '/api/health', method: 'GET', name: 'Health Check' },
      { path: '/api/scripts', method: 'GET', name: 'Get Scripts' },
      { path: '/api/categories', method: 'GET', name: 'Get Categories' },
      { path: '/api/analytics/scripts', method: 'GET', name: 'Get Analytics' },
    ];

    for (const endpoint of endpoints) {
      const timings = [];
      const errors = [];

      // Warm-up request
      try {
        await axios({ method: endpoint.method, url: `${CONFIG.BACKEND_URL}${endpoint.path}` });
      } catch (err) {
        // Ignore warm-up errors
      }

      // Measure response times
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        try {
          await axios({ method: endpoint.method, url: `${CONFIG.BACKEND_URL}${endpoint.path}` });
          timings.push(Date.now() - startTime);
        } catch (err) {
          errors.push(err.message);
          timings.push(-1); // Mark as error
        }
      }

      const validTimings = timings.filter(t => t > 0);
      this.metrics.backend.apiResponseTimes[endpoint.name] = {
        min: Math.min(...validTimings),
        max: Math.max(...validTimings),
        avg: (validTimings.reduce((a, b) => a + b, 0) / validTimings.length).toFixed(2),
        p95: this.calculatePercentile(validTimings, 95),
        p99: this.calculatePercentile(validTimings, 99),
        errorRate: ((errors.length / timings.length) * 100).toFixed(2) + '%',
      };
    }
  }

  async collectSystemMetrics() {
    console.log('\n💻 Collecting System Metrics...');
    
    // CPU usage
    const cpuUsage = os.loadavg();
    this.metrics.system.cpuUsage = {
      '1min': cpuUsage[0].toFixed(2),
      '5min': cpuUsage[1].toFixed(2),
      '15min': cpuUsage[2].toFixed(2),
      cores: os.cpus().length,
    };

    // Memory usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    this.metrics.system.memoryUsage = {
      total: (totalMem / 1073741824).toFixed(2) + ' GB',
      used: (usedMem / 1073741824).toFixed(2) + ' GB',
      free: (freeMem / 1073741824).toFixed(2) + ' GB',
      percentage: ((usedMem / totalMem) * 100).toFixed(2) + '%',
    };

    // Network latency test
    const pingResults = [];
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      try {
        await axios.get(`${CONFIG.BACKEND_URL}/api/health`);
        pingResults.push(Date.now() - start);
      } catch (err) {
        pingResults.push(-1);
      }
    }

    this.metrics.system.networkLatency = {
      min: Math.min(...pingResults.filter(p => p > 0)),
      max: Math.max(...pingResults.filter(p => p > 0)),
      avg: (pingResults.filter(p => p > 0).reduce((a, b) => a + b, 0) / pingResults.filter(p => p > 0).length).toFixed(2),
    };
  }

  async testCachingEffectiveness() {
    console.log('\n💾 Testing Cache Effectiveness...');
    
    const testEndpoint = `${CONFIG.BACKEND_URL}/api/scripts`;
    const timingsWithoutCache = [];
    const timingsWithCache = [];

    // Clear cache (if endpoint available)
    try {
      await axios.post(`${CONFIG.BACKEND_URL}/api/cache/clear`);
    } catch (err) {
      console.log('Cache clear endpoint not available');
    }

    // Test without cache (first requests)
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      try {
        await axios.get(testEndpoint, { headers: { 'Cache-Control': 'no-cache' } });
        timingsWithoutCache.push(Date.now() - start);
      } catch (err) {
        timingsWithoutCache.push(-1);
      }
    }

    // Test with cache (subsequent requests)
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      try {
        await axios.get(testEndpoint);
        timingsWithCache.push(Date.now() - start);
      } catch (err) {
        timingsWithCache.push(-1);
      }
    }

    const avgWithoutCache = timingsWithoutCache.filter(t => t > 0).reduce((a, b) => a + b, 0) / timingsWithoutCache.filter(t => t > 0).length;
    const avgWithCache = timingsWithCache.filter(t => t > 0).reduce((a, b) => a + b, 0) / timingsWithCache.filter(t => t > 0).length;

    this.metrics.cache = {
      avgResponseTimeWithoutCache: avgWithoutCache.toFixed(2) + ' ms',
      avgResponseTimeWithCache: avgWithCache.toFixed(2) + ' ms',
      improvement: ((1 - avgWithCache / avgWithoutCache) * 100).toFixed(2) + '%',
      hitRate: 'N/A (requires cache instrumentation)',
    };
  }

  async testScalability() {
    console.log('\n📈 Testing Scalability...');
    
    for (const concurrentUsers of CONFIG.CONCURRENT_USERS) {
      console.log(`Testing with ${concurrentUsers} concurrent users...`);
      
      const results = {
        responseTimes: [],
        errors: 0,
        throughput: 0,
      };

      const startTime = Date.now();
      const promises = [];

      // Simulate concurrent users
      for (let i = 0; i < concurrentUsers * 10; i++) {
        promises.push(
          (async () => {
            const reqStart = Date.now();
            try {
              await axios.get(`${CONFIG.BACKEND_URL}/api/scripts`);
              results.responseTimes.push(Date.now() - reqStart);
            } catch (err) {
              results.errors++;
            }
          })()
        );

        // Stagger requests slightly
        if (i % concurrentUsers === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      await Promise.all(promises);

      const duration = (Date.now() - startTime) / 1000;
      results.throughput = ((concurrentUsers * 10 - results.errors) / duration).toFixed(2);

      this.metrics.scalability.responseTimeByLoad[`${concurrentUsers} users`] = {
        min: Math.min(...results.responseTimes),
        max: Math.max(...results.responseTimes),
        avg: (results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length).toFixed(2),
        p95: this.calculatePercentile(results.responseTimes, 95),
        throughput: results.throughput + ' req/s',
        errorRate: ((results.errors / (concurrentUsers * 10)) * 100).toFixed(2) + '%',
      };
    }
  }

  calculatePercentile(arr, percentile) {
    if (arr.length === 0) return 0;
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  async generateReport() {
    console.log('\n📝 Generating Performance Report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(),
      metrics: this.metrics,
      recommendations: this.generateRecommendations(),
      optimizationOpportunities: this.identifyOptimizations(),
    };

    const reportPath = path.join(CONFIG.RESULTS_DIR, `performance-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = path.join(CONFIG.RESULTS_DIR, `performance-report-${Date.now()}.md`);
    await fs.writeFile(markdownPath, markdownReport);

    console.log(`\n✅ Reports saved to:`);
    console.log(`   - JSON: ${reportPath}`);
    console.log(`   - Markdown: ${markdownPath}`);

    return report;
  }

  generateSummary() {
    const { frontend, backend, system, cache, scalability } = this.metrics;
    
    // Calculate performance grades
    const grades = {
      frontend: this.calculateFrontendGrade(frontend.coreWebVitals),
      backend: this.calculateBackendGrade(backend.apiResponseTimes),
      scalability: this.calculateScalabilityGrade(scalability.responseTimeByLoad),
    };

    return {
      performanceScore: this.calculateOverallScore(grades),
      grades,
      criticalIssues: this.identifyCriticalIssues(),
      keyMetrics: {
        lcp: frontend.coreWebVitals.lcp,
        avgApiResponse: this.calculateAvgApiResponse(backend.apiResponseTimes),
        bundleSize: frontend.bundleSizes.totalSizeMB,
        cacheImprovement: cache.improvement,
      },
    };
  }

  calculateFrontendGrade(vitals) {
    let score = 100;
    
    // LCP scoring
    if (vitals.lcp > 4000) score -= 30;
    else if (vitals.lcp > 2500) score -= 15;
    
    // FID scoring
    if (vitals.fid > 300) score -= 20;
    else if (vitals.fid > 100) score -= 10;
    
    // CLS scoring
    if (vitals.cls > 0.25) score -= 20;
    else if (vitals.cls > 0.1) score -= 10;
    
    // FCP scoring
    if (vitals.fcp > 3000) score -= 15;
    else if (vitals.fcp > 1800) score -= 7;
    
    // TTFB scoring
    if (vitals.ttfb > 800) score -= 15;
    else if (vitals.ttfb > 600) score -= 7;

    return this.scoreToGrade(score);
  }

  calculateBackendGrade(apiTimes) {
    let totalScore = 0;
    let count = 0;

    for (const [endpoint, times] of Object.entries(apiTimes)) {
      let score = 100;
      const avgTime = parseFloat(times.avg);
      
      if (avgTime > 500) score -= 40;
      else if (avgTime > 200) score -= 20;
      else if (avgTime > 100) score -= 10;

      const errorRate = parseFloat(times.errorRate);
      if (errorRate > 5) score -= 30;
      else if (errorRate > 1) score -= 15;

      totalScore += score;
      count++;
    }

    return this.scoreToGrade(totalScore / count);
  }

  calculateScalabilityGrade(loadTests) {
    let score = 100;
    const loads = Object.entries(loadTests);
    
    if (loads.length > 1) {
      const firstLoad = parseFloat(loads[0][1].avg);
      const lastLoad = parseFloat(loads[loads.length - 1][1].avg);
      
      const degradation = (lastLoad / firstLoad - 1) * 100;
      
      if (degradation > 200) score -= 40;
      else if (degradation > 100) score -= 25;
      else if (degradation > 50) score -= 15;

      const lastErrorRate = parseFloat(loads[loads.length - 1][1].errorRate);
      if (lastErrorRate > 10) score -= 30;
      else if (lastErrorRate > 5) score -= 20;
      else if (lastErrorRate > 1) score -= 10;
    }

    return this.scoreToGrade(score);
  }

  scoreToGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  calculateOverallScore(grades) {
    const gradeValues = { A: 4, B: 3, C: 2, D: 1, F: 0 };
    const values = Object.values(grades).map(g => gradeValues[g]);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    
    if (avg >= 3.5) return 'Excellent';
    if (avg >= 2.5) return 'Good';
    if (avg >= 1.5) return 'Needs Improvement';
    return 'Poor';
  }

  calculateAvgApiResponse(apiTimes) {
    const times = Object.values(apiTimes).map(t => parseFloat(t.avg));
    return (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2) + ' ms';
  }

  identifyCriticalIssues() {
    const issues = [];
    const { frontend, backend, scalability } = this.metrics;

    // Frontend issues
    if (frontend.coreWebVitals.lcp > 4000) {
      issues.push({
        severity: 'CRITICAL',
        area: 'Frontend',
        issue: `LCP is ${frontend.coreWebVitals.lcp}ms (target: <2500ms)`,
        impact: 'Poor user experience, high bounce rate',
      });
    }

    if (frontend.bundleSizes.totalSizeMB && parseFloat(frontend.bundleSizes.totalSizeMB) > 5) {
      issues.push({
        severity: 'HIGH',
        area: 'Frontend',
        issue: `Bundle size is ${frontend.bundleSizes.totalSizeMB} MB (target: <2MB)`,
        impact: 'Slow initial load, especially on mobile',
      });
    }

    // Backend issues
    for (const [endpoint, times] of Object.entries(backend.apiResponseTimes)) {
      if (parseFloat(times.avg) > 500) {
        issues.push({
          severity: 'HIGH',
          area: 'Backend',
          issue: `${endpoint} avg response time is ${times.avg}ms (target: <200ms)`,
          impact: 'Slow API responses affect user experience',
        });
      }
    }

    // Scalability issues
    const loads = Object.entries(scalability.responseTimeByLoad);
    if (loads.length > 0) {
      const lastLoad = loads[loads.length - 1][1];
      if (parseFloat(lastLoad.errorRate) > 5) {
        issues.push({
          severity: 'CRITICAL',
          area: 'Scalability',
          issue: `Error rate reaches ${lastLoad.errorRate} under load`,
          impact: 'Service degradation under normal traffic',
        });
      }
    }

    return issues;
  }

  identifyOptimizations() {
    const optimizations = [];
    const { frontend, backend, cache } = this.metrics;

    // Bundle optimization
    if (frontend.bundleSizes.bundles) {
      for (const [category, bundle] of Object.entries(frontend.bundleSizes.bundles)) {
        const size = parseFloat(bundle.totalSize);
        if (size > 500) {
          optimizations.push({
            priority: 'HIGH',
            area: 'Bundle Size',
            optimization: `Optimize ${category} bundle (currently ${bundle.totalSize})`,
            technique: category === 'react-vendor' ? 'Consider using preact or tree-shaking unused MUI components' :
                      category === 'visualization' ? 'Lazy load chart.js and d3 libraries' :
                      category === 'editor' ? 'Lazy load Monaco editor on demand' :
                      'Apply code splitting and dynamic imports',
            estimatedImprovement: '30-50% size reduction',
          });
        }
      }
    }

    // API optimization
    for (const [endpoint, times] of Object.entries(backend.apiResponseTimes)) {
      if (parseFloat(times.avg) > 200) {
        optimizations.push({
          priority: parseFloat(times.avg) > 500 ? 'CRITICAL' : 'MEDIUM',
          area: 'API Performance',
          optimization: `Optimize ${endpoint} endpoint`,
          technique: 'Add database indexes, implement pagination, use Redis caching',
          estimatedImprovement: `${Math.round(parseFloat(times.avg) * 0.6)}ms response time`,
        });
      }
    }

    // Cache optimization
    if (cache.improvement && parseFloat(cache.improvement) < 50) {
      optimizations.push({
        priority: 'HIGH',
        area: 'Caching',
        optimization: 'Improve cache effectiveness',
        technique: 'Implement Redis caching for frequently accessed data, add HTTP cache headers',
        estimatedImprovement: '70-80% cache hit rate',
      });
    }

    // Frontend rendering
    if (frontend.coreWebVitals.lcp > 2500) {
      optimizations.push({
        priority: 'HIGH',
        area: 'Frontend Rendering',
        optimization: 'Improve Largest Contentful Paint',
        technique: 'Preload critical resources, optimize images, use resource hints',
        estimatedImprovement: `${Math.round(frontend.coreWebVitals.lcp * 0.5)}ms LCP`,
      });
    }

    return optimizations;
  }

  generateRecommendations() {
    return {
      immediate: [
        'Enable gzip/brotli compression for all text assets',
        'Add database indexes for frequently queried fields',
        'Implement Redis caching for API responses',
        'Optimize images with WebP format and responsive sizes',
        'Remove unused JavaScript dependencies',
      ],
      shortTerm: [
        'Implement code splitting for route-based chunks',
        'Add service worker for offline functionality',
        'Optimize database queries with query analysis',
        'Implement pagination for list endpoints',
        'Add CDN for static assets',
      ],
      longTerm: [
        'Consider micro-frontend architecture for better code splitting',
        'Implement read replicas for database scaling',
        'Add edge computing for global performance',
        'Migrate to faster runtime (e.g., Bun, Deno)',
        'Implement GraphQL for efficient data fetching',
      ],
    };
  }

  generateMarkdownReport(report) {
    return `# PSScript Performance Benchmark Report

**Date**: ${new Date(report.timestamp).toLocaleString()}
**Overall Performance Score**: ${report.summary.performanceScore}

## Executive Summary

### Performance Grades
- **Frontend**: ${report.summary.grades.frontend}
- **Backend**: ${report.summary.grades.backend}
- **Scalability**: ${report.summary.grades.scalability}

### Key Metrics
- **LCP**: ${report.summary.keyMetrics.lcp}ms
- **Average API Response**: ${report.summary.keyMetrics.avgApiResponse}
- **Total Bundle Size**: ${report.summary.keyMetrics.bundleSize || 'N/A'}
- **Cache Improvement**: ${report.summary.keyMetrics.cacheImprovement || 'N/A'}

## Critical Issues

${report.summary.criticalIssues.map(issue => `
### ${issue.severity}: ${issue.area}
- **Issue**: ${issue.issue}
- **Impact**: ${issue.impact}
`).join('\n')}

## Frontend Performance

### Core Web Vitals
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| LCP | ${report.metrics.frontend.coreWebVitals.lcp}ms | <2500ms | ${report.metrics.frontend.coreWebVitals.lcp < 2500 ? '✅' : '❌'} |
| FID | ${report.metrics.frontend.coreWebVitals.fid}ms | <100ms | ${report.metrics.frontend.coreWebVitals.fid < 100 ? '✅' : '❌'} |
| CLS | ${report.metrics.frontend.coreWebVitals.cls} | <0.1 | ${report.metrics.frontend.coreWebVitals.cls < 0.1 ? '✅' : '❌'} |
| FCP | ${report.metrics.frontend.coreWebVitals.fcp}ms | <1800ms | ${report.metrics.frontend.coreWebVitals.fcp < 1800 ? '✅' : '❌'} |
| TTFB | ${report.metrics.frontend.coreWebVitals.ttfb}ms | <600ms | ${report.metrics.frontend.coreWebVitals.ttfb < 600 ? '✅' : '❌'} |

### Bundle Sizes
${report.metrics.frontend.bundleSizes.bundles ? Object.entries(report.metrics.frontend.bundleSizes.bundles).map(([category, bundle]) => `
- **${category}**: ${bundle.totalSize}`).join('\n') : 'Bundle analysis failed'}

**Total Size**: ${report.metrics.frontend.bundleSizes.totalSizeMB || 'N/A'}

### Memory Usage
${report.metrics.frontend.memoryUsage ? `
- **Used JS Heap**: ${report.metrics.frontend.memoryUsage.usedJSHeapSize}
- **Total JS Heap**: ${report.metrics.frontend.memoryUsage.totalJSHeapSize}
- **JS Heap Limit**: ${report.metrics.frontend.memoryUsage.jsHeapSizeLimit}
` : 'Memory profiling not available'}

## Backend Performance

### API Response Times
| Endpoint | Min | Avg | P95 | P99 | Max | Error Rate |
|----------|-----|-----|-----|-----|-----|------------|
${Object.entries(report.metrics.backend.apiResponseTimes).map(([endpoint, times]) => `| ${endpoint} | ${times.min}ms | ${times.avg}ms | ${times.p95}ms | ${times.p99}ms | ${times.max}ms | ${times.errorRate} |`).join('\n')}

## System Metrics

### CPU Usage
- **1 min avg**: ${report.metrics.system.cpuUsage['1min']}
- **5 min avg**: ${report.metrics.system.cpuUsage['5min']}
- **15 min avg**: ${report.metrics.system.cpuUsage['15min']}
- **CPU Cores**: ${report.metrics.system.cpuUsage.cores}

### Memory Usage
- **Total**: ${report.metrics.system.memoryUsage.total}
- **Used**: ${report.metrics.system.memoryUsage.used} (${report.metrics.system.memoryUsage.percentage})
- **Free**: ${report.metrics.system.memoryUsage.free}

### Network Latency
- **Min**: ${report.metrics.system.networkLatency.min}ms
- **Avg**: ${report.metrics.system.networkLatency.avg}ms
- **Max**: ${report.metrics.system.networkLatency.max}ms

## Caching Effectiveness
${report.metrics.cache ? `
- **Response Time without Cache**: ${report.metrics.cache.avgResponseTimeWithoutCache}
- **Response Time with Cache**: ${report.metrics.cache.avgResponseTimeWithCache}
- **Improvement**: ${report.metrics.cache.improvement}
` : 'Cache testing not performed'}

## Scalability Analysis

### Response Time Under Load
| Concurrent Users | Min | Avg | P95 | Throughput | Error Rate |
|-----------------|-----|-----|-----|------------|------------|
${Object.entries(report.metrics.scalability.responseTimeByLoad).map(([users, metrics]) => `| ${users} | ${metrics.min}ms | ${metrics.avg}ms | ${metrics.p95}ms | ${metrics.throughput} | ${metrics.errorRate} |`).join('\n')}

## Optimization Opportunities

${report.optimizationOpportunities.map(opt => `
### ${opt.priority}: ${opt.area}
- **Optimization**: ${opt.optimization}
- **Technique**: ${opt.technique}
- **Estimated Improvement**: ${opt.estimatedImprovement}
`).join('\n')}

## Recommendations

### Immediate Actions
${report.recommendations.immediate.map(rec => `- ${rec}`).join('\n')}

### Short-term Improvements
${report.recommendations.shortTerm.map(rec => `- ${rec}`).join('\n')}

### Long-term Strategy
${report.recommendations.longTerm.map(rec => `- ${rec}`).join('\n')}

## Performance Budget Recommendations

### Frontend Budget
- **HTML**: <15KB
- **CSS**: <50KB per file
- **JavaScript**: <200KB per chunk
- **Images**: <100KB per image
- **Total Initial Load**: <1MB

### Backend Budget
- **API Response p95**: <200ms
- **Database Query p95**: <50ms
- **Error Rate**: <1%
- **Throughput**: >100 req/s per instance

### Monitoring Alerts
- Alert if LCP >3s
- Alert if API p95 >500ms
- Alert if error rate >2%
- Alert if memory usage >80%
`;
  }
}

// Main execution
async function runBenchmark() {
  console.log('🚀 PSScript Performance Benchmarking Suite');
  console.log('=========================================\n');

  await ensureResultsDir();

  const metrics = new PerformanceMetrics();
  let browser;

  try {
    // Check if frontend is accessible
    try {
      await axios.get(CONFIG.FRONTEND_URL);
      browser = await puppeteer.launch({ headless: 'new' });
      await metrics.collectFrontendMetrics(browser);
      await metrics.collectBundleSizes();
    } catch (err) {
      console.error('❌ Frontend not accessible:', err.message);
      console.log('Skipping frontend metrics...\n');
    }

    // Collect other metrics
    await metrics.collectBackendMetrics();
    await metrics.collectSystemMetrics();
    await metrics.testCachingEffectiveness();
    await metrics.testScalability();

    // Generate report
    const report = await metrics.generateReport();

    console.log('\n\n========== PERFORMANCE SUMMARY ==========\n');
    console.log(`Overall Score: ${report.summary.performanceScore}`);
    console.log(`\nGrades:`);
    console.log(`  Frontend: ${report.summary.grades.frontend}`);
    console.log(`  Backend: ${report.summary.grades.backend}`);
    console.log(`  Scalability: ${report.summary.grades.scalability}`);
    
    if (report.summary.criticalIssues.length > 0) {
      console.log(`\n⚠️  Critical Issues Found: ${report.summary.criticalIssues.length}`);
      report.summary.criticalIssues.forEach(issue => {
        console.log(`  - [${issue.severity}] ${issue.issue}`);
      });
    }

    console.log('\n✅ Benchmarking complete! Check the results directory for detailed reports.');

  } catch (err) {
    console.error('\n❌ Benchmarking failed:', err);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run if executed directly
if (require.main === module) {
  runBenchmark().catch(console.error);
}

module.exports = { PerformanceMetrics, runBenchmark };