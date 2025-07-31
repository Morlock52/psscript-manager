import { z } from 'zod';

// Documentation item schema
export const documentationItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  url: z.string().url(),
  content: z.string().max(10000),
  source: z.string(),
  tags: z.array(z.string()),
  crawledAt: z.string(),
  similarity: z.number().min(0).max(1).optional()
});

export type DocumentationItem = z.infer<typeof documentationItemSchema>;

// Crawl configuration schema
export const crawlConfigSchema = z.object({
  url: z.string().url().refine(url => {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }, { message: "Only HTTP(S) URLs are allowed" }),
  maxPages: z.number().min(1).max(100),
  depth: z.number().min(1).max(5),
  includeExternalLinks: z.boolean(),
  fileTypes: z.array(z.enum(['html', 'pdf', 'md']))
});

export type CrawlConfig = z.infer<typeof crawlConfigSchema>;

// Search parameters schema
export const searchParamsSchema = z.object({
  query: z.string().max(200).optional(),
  sources: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['relevance', 'date', 'title']).default('relevance')
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

// API response schemas
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  error: z.string().optional(),
  message: z.string().optional()
});

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean()
  });

// Crawl status schema
export const crawlStatusSchema = z.object({
  id: z.string(),
  url: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  progress: z.number().min(0).max(100),
  pagesProcessed: z.number(),
  totalPages: z.number(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  error: z.string().optional()
});

export type CrawlStatus = z.infer<typeof crawlStatusSchema>;