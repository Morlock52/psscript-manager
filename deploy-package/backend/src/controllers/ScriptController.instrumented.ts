/**
 * Example of instrumented ScriptController with custom business metrics
 * This shows how to add telemetry to existing controllers
 */
import { Request, Response, NextFunction } from 'express';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { 
  recordScriptUpload, 
  recordScriptExecution, 
  recordScriptAnalysisScores,
  scriptAnalysisCounter,
  databaseQueryDurationHistogram
} from '../telemetry/metrics';

const tracer = trace.getTracer('psscript-backend-controllers', '1.0.0');

class InstrumentedScriptController {
  // Example: Instrumented upload method
  uploadScript = async (req: Request, res: Response, next: NextFunction) => {
    const span = tracer.startSpan('script.upload', {
      attributes: {
        'script.name': req.body.name || 'unknown',
        'script.category': req.body.categoryId || 'uncategorized',
        'user.id': (req as any).user?.userId || 'anonymous',
      }
    });

    const startTime = Date.now();

    try {
      // Add script size to span
      const scriptSize = req.file?.size || 0;
      span.setAttribute('script.size', scriptSize);

      // Your existing upload logic here...
      // For example:
      const result = await context.with(trace.setSpan(context.active(), span), async () => {
        // Database operations would happen here
        return { id: 1, name: req.body.name };
      });

      // Record custom metrics
      recordScriptUpload(scriptSize, req.body.categoryId || 'uncategorized');
      
      span.setStatus({ code: SpanStatusCode.OK });
      res.json({ success: true, script: result });
    } catch (error: any) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      
      // Record failure metric
      scriptAnalysisCounter.add(1, { status: 'failure', operation: 'upload' });
      
      next(error);
    } finally {
      span.end();
    }
  };

  // Example: Instrumented analysis method
  analyzeScript = async (req: Request, res: Response, next: NextFunction) => {
    const span = tracer.startSpan('script.analyze', {
      attributes: {
        'script.id': req.params.id,
        'user.id': (req as any).user?.userId || 'anonymous',
      }
    });

    const analysisStartTime = Date.now();

    try {
      // Create child span for AI service call
      const aiSpan = tracer.startSpan('ai.analyze_script', {
        attributes: {
          'ai.service': 'openai',
          'ai.operation': 'script_analysis',
        }
      });

      // Your AI analysis logic here...
      const analysisResult = await context.with(trace.setSpan(context.active(), aiSpan), async () => {
        // AI service call would happen here
        return {
          securityScore: 85,
          complexityScore: 42,
          recommendations: []
        };
      });

      aiSpan.end();

      // Record analysis scores
      recordScriptAnalysisScores(
        analysisResult.securityScore,
        analysisResult.complexityScore
      );

      // Create span for database update
      const dbSpan = tracer.startSpan('db.update_analysis');
      const dbStartTime = Date.now();

      await context.with(trace.setSpan(context.active(), dbSpan), async () => {
        // Database update would happen here
      });

      const dbDuration = (Date.now() - dbStartTime) / 1000;
      databaseQueryDurationHistogram.record(dbDuration, { 
        operation: 'update',
        table: 'script_analysis' 
      });
      dbSpan.end();

      span.setStatus({ code: SpanStatusCode.OK });
      res.json({ success: true, analysis: analysisResult });
    } catch (error: any) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      next(error);
    } finally {
      const duration = (Date.now() - analysisStartTime) / 1000;
      span.setAttribute('analysis.duration', duration);
      span.end();
    }
  };

  // Example: Instrumented execution method
  executeScript = async (req: Request, res: Response, next: NextFunction) => {
    const span = tracer.startSpan('script.execute', {
      attributes: {
        'script.id': req.params.id,
        'user.id': (req as any).user?.userId || 'anonymous',
        'execution.parameters': JSON.stringify(req.body.parameters || {}),
      }
    });

    const executionStartTime = Date.now();

    try {
      // Your script execution logic here...
      const executionResult = await context.with(trace.setSpan(context.active(), span), async () => {
        // Execution would happen here
        return {
          exitCode: 0,
          output: 'Script executed successfully',
          errors: []
        };
      });

      const duration = (Date.now() - executionStartTime) / 1000;
      
      // Record execution metrics
      recordScriptExecution(
        duration,
        executionResult.exitCode === 0 ? 'success' : 'failure'
      );

      span.setAttributes({
        'execution.exit_code': executionResult.exitCode,
        'execution.duration': duration,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      res.json({ success: true, result: executionResult });
    } catch (error: any) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      
      const duration = (Date.now() - executionStartTime) / 1000;
      recordScriptExecution(duration, 'failure');
      
      next(error);
    } finally {
      span.end();
    }
  };

  // Example: Helper method to create database query spans
  private async traceDatabaseQuery<T>(
    operationName: string,
    queryFn: () => Promise<T>,
    table: string
  ): Promise<T> {
    const span = tracer.startSpan(`db.${operationName}`, {
      attributes: {
        'db.system': 'postgresql',
        'db.operation': operationName,
        'db.table': table,
      }
    });

    const startTime = Date.now();

    try {
      const result = await context.with(trace.setSpan(context.active(), span), queryFn);
      
      const duration = (Date.now() - startTime) / 1000;
      databaseQueryDurationHistogram.record(duration, {
        operation: operationName,
        table: table
      });
      
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error: any) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      throw error;
    } finally {
      span.end();
    }
  }
}

export default InstrumentedScriptController;