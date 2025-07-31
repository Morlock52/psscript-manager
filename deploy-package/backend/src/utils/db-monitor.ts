/**
 * Database monitoring utility
 * Monitors database health and records metrics
 */
import fs from 'fs';
import path from 'path';
import { Sequelize } from 'sequelize';
import logger from './logger';

class DbMonitor {
  private sequelize: Sequelize;
  private isMonitoring: boolean = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private metrics: Array<{
    timestamp: number;
    responseTime: number; // in ms
    status: string;
    query: string;
    error?: string;
  }> = [];
  private logsPath: string;
  private metricsPath: string;
  private checkIntervalMs: number;

  constructor(sequelize: Sequelize, options: { checkIntervalMs?: number } = {}) {
    this.sequelize = sequelize;
    this.checkIntervalMs = options.checkIntervalMs || 30000; // Default to 30 seconds
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    
    // Setup log paths
    const logsDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    this.logsPath = path.join(logsDir, `db-monitor-${timestamp}.log`);
    this.metricsPath = path.join(logsDir, `db-monitor-${timestamp}.csv`);
    
    // Initialize the metrics CSV file with headers
    fs.writeFileSync(this.metricsPath, 'timestamp,responseTime,status,query,error\n');
    
    logger.info(`DB Monitor initialized. Logs will be written to: ${this.logsPath}`);
    logger.info(`DB Metrics will be collected at: ${this.metricsPath}`);
  }

  public async start(): Promise<void> {
    if (this.isMonitoring) {
      logger.warn('DB Monitor is already running');
      return;
    }
    
    this.isMonitoring = true;
    logger.info('Starting DB monitor...');
    
    this.log('DB Monitor started');
    
    // Perform an initial check
    await this.check();
    
    // Set up regular checks
    this.monitorInterval = setInterval(async () => {
      await this.check();
    }, this.checkIntervalMs);
  }

  public stop(): void {
    if (!this.isMonitoring) {
      logger.warn('DB Monitor is not running');
      return;
    }
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    this.isMonitoring = false;
    this.log('DB Monitor stopped');
    logger.info('DB Monitor stopped');
  }

  public getMetrics(): { metrics: typeof this.metrics, summary: any } {
    // Calculate summary statistics
    let totalResponseTime = 0;
    let successCount = 0;
    let failureCount = 0;
    const lastMetrics = this.metrics.slice(-10); // Last 10 metrics for recent history
    
    this.metrics.forEach(metric => {
      totalResponseTime += metric.responseTime;
      if (metric.status === 'success') {
        successCount++;
      } else {
        failureCount++;
      }
    });
    
    const summary = {
      totalChecks: this.metrics.length,
      avgResponseTime: this.metrics.length ? totalResponseTime / this.metrics.length : 0,
      successRate: this.metrics.length ? (successCount / this.metrics.length) * 100 : 0,
      lastStatus: this.metrics.length ? this.metrics[this.metrics.length - 1].status : 'unknown',
      recentMetrics: lastMetrics
    };
    
    return {
      metrics: this.metrics,
      summary
    };
  }

  public async forceCheck(): Promise<{
    status: string;
    responseTime: number;
    query: string;
    error?: string;
  }> {
    return await this.check();
  }

  private async check(): Promise<{
    status: string;
    responseTime: number;
    query: string;
    error?: string;
  }> {
    const startTime = Date.now();
    const testQuery = 'SELECT 1+1 as result';
    let status = 'success';
    let error: string | undefined;
    
    try {
      await this.sequelize.query(testQuery);
      this.log(`Health check succeeded in ${Date.now() - startTime}ms`);
    } catch (err: any) {
      status = 'error';
      error = err.message || 'Unknown error';
      this.log(`Health check failed: ${error}`, 'error');
      
      // Attempt to recover connection
      try {
        logger.info('Attempting to recover database connection...');
        await this.sequelize.authenticate({ logging: false });
        this.log('Connection recovery successful', 'info');
      } catch (recoveryErr: any) {
        this.log(`Connection recovery failed: ${recoveryErr.message}`, 'error');
      }
    }
    
    const responseTime = Date.now() - startTime;
    
    // Record the metric
    const metric = {
      timestamp: startTime,
      responseTime,
      status,
      query: testQuery,
      error
    };
    
    this.metrics.push(metric);
    
    // Maintain a reasonable buffer size
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
    
    // Write to CSV file
    this.writeMetricToCsv(metric);
    
    return metric;
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} [${level.toUpperCase()}] ${message}\n`;
    
    try {
      fs.appendFileSync(this.logsPath, logEntry);
    } catch (err) {
      logger.error(`Failed to write to DB monitor log: ${err}`);
    }
    
    // Also log to the application logger
    switch (level) {
      case 'warn':
        logger.warn(`[DB Monitor] ${message}`);
        break;
      case 'error':
        logger.error(`[DB Monitor] ${message}`);
        break;
      default:
        logger.info(`[DB Monitor] ${message}`);
    }
  }

  private writeMetricToCsv(metric: {
    timestamp: number;
    responseTime: number;
    status: string;
    query: string;
    error?: string;
  }): void {
    const csvLine = `${metric.timestamp},${metric.responseTime},${metric.status},"${metric.query.replace(/"/g, '""')}","${metric.error ? metric.error.replace(/"/g, '""') : ''}"\n`;
    
    try {
      fs.appendFileSync(this.metricsPath, csvLine);
    } catch (err) {
      logger.error(`Failed to write to DB metrics file: ${err}`);
    }
  }

  /**
   * Get database health status and diagnostics
   */
  public async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    message: string;
    diagnostics: {
      connectionInfo: any;
      serverInfo?: any;
      responseTime: number;
      successRate: number;
      lastErrors: string[];
    };
  }> {
    // Get current metrics
    const { summary } = this.getMetrics();
    
    // Get the last 5 errors
    const lastErrors = this.metrics
      .filter(m => m.status === 'error')
      .slice(-5)
      .map(m => m.error || 'Unknown error');
    
    // Get connection information
    let serverInfo = undefined;
    const connectionInfo = {
      host: this.sequelize.config.host,
      port: this.sequelize.config.port,
      database: this.sequelize.config.database,
      connected: summary.lastStatus === 'success'
    };
    
    // Try to get server information if connected
    if (summary.lastStatus === 'success') {
      try {
        const [results] = await this.sequelize.query(`
          SELECT 
            current_database() as database,
            NOW() as server_time,
            version() as version,
            pg_size_pretty(pg_database_size(current_database())) as db_size,
            (SELECT count(*) FROM pg_stat_activity) as active_connections
        `);
        serverInfo = results[0];
      } catch (err) {
        logger.error(`Failed to get server info: ${err}`);
      }
    }
    
    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = '';
    
    if (summary.lastStatus !== 'success') {
      status = 'unhealthy';
      message = 'Database connection is currently unavailable';
    } else if (summary.successRate < 90) {
      status = 'degraded';
      message = 'Database connection is unstable (success rate below 90%)';
    } else if (summary.avgResponseTime > 1000) {
      status = 'degraded';
      message = 'Database response time is slow (above 1000ms)';
    }
    
    return {
      status,
      message,
      diagnostics: {
        connectionInfo,
        serverInfo,
        responseTime: summary.avgResponseTime,
        successRate: summary.successRate,
        lastErrors
      }
    };
  }
}

export default DbMonitor;