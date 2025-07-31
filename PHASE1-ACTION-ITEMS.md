# Phase 1 Action Items - Documentation System

## Immediate Actions Required (Day 1)

### 1. Security Critical Fixes
```bash
# Already installed DOMPurify
npm install dompurify @types/dompurify ✅

# Add to all components rendering user content:
import { sanitizeHtml, sanitizeUserInput, sanitizeUrl } from '@/utils/sanitize';
```

### 2. Quick Accessibility Fixes
```css
/* Add to index.css or tailwind config */
/* Fix color contrast issues */
.text-gray-400 { @apply text-gray-300; }

/* Better focus indicators */
*:focus-visible {
  @apply outline-2 outline-offset-2 outline-blue-500;
}

/* Screen reader only class */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border-width: 0;
}
```

### 3. Add Loading Announcements
```typescript
// Add to Documentation.tsx after line 365
{isLoading && (
  <div className="sr-only" role="status" aria-live="polite">
    Loading documentation...
  </div>
)}

// Add to search results
<div className="sr-only" role="status" aria-live="polite">
  {filteredItems.length} documentation items found
</div>
```

## Backend Implementation (Days 2-4)

### 1. Create Database Schema
```sql
-- migrations/create_documentation_tables.sql
CREATE TABLE documentation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  url TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  source VARCHAR(100) NOT NULL,
  tags TEXT[] DEFAULT '{}',
  crawled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE documentation_crawls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  pages_processed INTEGER DEFAULT 0,
  total_pages INTEGER,
  error TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_doc_source ON documentation_items(source);
CREATE INDEX idx_doc_tags ON documentation_items USING GIN(tags);
CREATE INDEX idx_doc_search ON documentation_items USING GIN(to_tsvector('english', title || ' ' || content));
```

### 2. Create Sequelize Models
```typescript
// src/backend/src/models/DocumentationItem.ts
import { Model, DataTypes } from 'sequelize';

export class DocumentationItem extends Model {
  public id!: string;
  public title!: string;
  public url!: string;
  public content!: string;
  public source!: string;
  public tags!: string[];
  public crawledAt!: Date;
}

// src/backend/src/models/DocumentationCrawl.ts
export class DocumentationCrawl extends Model {
  public id!: string;
  public url!: string;
  public status!: 'pending' | 'running' | 'completed' | 'failed';
  public progress!: number;
  // ... other fields
}
```

### 3. Create Controllers
```typescript
// src/backend/src/controllers/DocumentationController.ts
export class DocumentationController {
  static async getRecent(req: Request, res: Response) {
    // Implementation
  }
  
  static async search(req: Request, res: Response) {
    // Implementation with full-text search
  }
  
  static async getSources(req: Request, res: Response) {
    // Get unique sources
  }
  
  static async getTags(req: Request, res: Response) {
    // Get all unique tags
  }
  
  static async startCrawl(req: Request, res: Response) {
    // Start crawl job
  }
  
  static async getCrawlStatus(req: Request, res: Response) {
    // Get job status
  }
}
```

### 4. Register Routes
```typescript
// src/backend/src/routes/documentation.ts
import { Router } from 'express';
import { DocumentationController } from '../controllers/DocumentationController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.get('/recent', DocumentationController.getRecent);
router.get('/search', DocumentationController.search);
router.get('/sources', DocumentationController.getSources);
router.get('/tags', DocumentationController.getTags);
router.post('/crawl', authenticateJWT, DocumentationController.startCrawl);
router.get('/crawl/:id/status', authenticateJWT, DocumentationController.getCrawlStatus);

export default router;

// Add to src/backend/src/index.ts
app.use('/api/documentation', documentationRoutes);
```

## Security Hardening (Days 5-6)

### 1. Implement CSP Headers
```typescript
// src/backend/src/middleware/security.ts
import helmet from 'helmet';

export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Will improve with nonces
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:*"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});
```

### 2. Add Input Validation
```typescript
// src/backend/src/middleware/validators/documentationValidators.ts
import { body, query, param } from 'express-validator';

export const validateSearch = [
  query('query').optional().isString().trim().escape(),
  query('sources').optional().isArray(),
  query('tags').optional().isArray(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 })
];

export const validateCrawl = [
  body('url').isURL().withMessage('Valid URL required'),
  body('maxPages').isInt({ min: 1, max: 100 }),
  body('depth').isInt({ min: 1, max: 5 })
];
```

### 3. Rate Limiting
```typescript
// src/backend/src/middleware/rateLimiting.ts
import rateLimit from 'express-rate-limit';

export const documentationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later.'
});

export const crawlLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 crawls per hour
  message: 'Crawl limit exceeded. Please wait before starting another crawl.'
});
```

## Testing Checklist

### Security Testing
- [ ] Test XSS prevention with malicious inputs
- [ ] Verify CSP headers are working
- [ ] Test rate limiting
- [ ] Check for SQL injection vulnerabilities
- [ ] Verify authentication on protected endpoints

### Accessibility Testing
- [ ] Test with screen reader (NVDA/JAWS)
- [ ] Navigate with keyboard only
- [ ] Check color contrast with tools
- [ ] Verify form labels work correctly
- [ ] Test error announcements

### Performance Testing
- [ ] Profile with Chrome DevTools
- [ ] Check bundle size
- [ ] Test with slow network
- [ ] Verify no memory leaks
- [ ] Check render performance with many items

## Monitoring Setup

### 1. Error Tracking
```typescript
// Install Sentry
npm install @sentry/react @sentry/tracing

// Initialize in index.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

### 2. Performance Monitoring
```typescript
// Add Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

const sendToAnalytics = (metric: any) => {
  // Send to your analytics endpoint
  console.log(metric);
};

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

## Success Criteria

### Phase 1 Complete When:
1. ✅ All documentation endpoints return data (not 404)
2. ✅ No CRITICAL security vulnerabilities
3. ✅ WCAG Level AA compliance for key workflows
4. ✅ Page load time < 3 seconds
5. ✅ All tests passing (security, accessibility, performance)

## Next Phase Preview

### Phase 2: Enhanced Features
- Implement vector search with embeddings
- Add real-time crawl progress with WebSockets
- Implement caching with Redis
- Add API documentation with Swagger
- Create admin dashboard for crawl management

---

This action plan provides concrete steps to transform the documentation system from its current non-functional state to a secure, accessible, and performant feature that meets 2025 web standards.