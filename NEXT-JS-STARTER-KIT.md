# PSScript Next.js 15 Starter Kit - 2025 Modern Architecture

## Quick Start Commands

```bash
# Create new Next.js 15 application
npx create-next-app@latest psscript-modern --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd psscript-modern

# Install modern dependency stack
npm install @auth/prisma-adapter @prisma/client @tanstack/react-query @trpc/client @trpc/next @trpc/react-query @trpc/server
npm install prisma zod react-hook-form @hookform/resolvers/zod sonner vaul
npm install framer-motion lucide-react class-variance-authority clsx tailwind-merge
npm install zustand @vercel/analytics @vercel/speed-insights

# Install shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input textarea form label select

# Development dependencies
npm install -D @types/node ts-node
```

## Project Structure Setup

```typescript
// Create the complete project structure
mkdir -p src/{app,components,lib,types,hooks}
mkdir -p src/app/{api,dashboard,scripts,auth,settings}
mkdir -p src/components/{ui,forms,layouts,providers}
mkdir -p src/app/api/{trpc,auth}

// Essential configuration files to create:
// 1. Environment variables
// 2. Database schema
// 3. Authentication config
// 4. tRPC router
// 5. Tailwind components
```

## 1. Environment Configuration

```bash
# .env.local
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/psscript"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-in-production"

# OAuth Providers (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Features
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 2. Database Schema (Prisma)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  role          Role      @default(USER)
  accounts      Account[]
  sessions      Session[]
  scripts       Script[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Script {
  id          String   @id @default(cuid())
  name        String
  description String?
  content     String   @db.Text
  category    String?
  hash        String   @unique
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([category])
}

enum Role {
  USER
  ADMIN
}
```

## 3. Authentication Setup (Auth.js v5)

```typescript
// src/lib/auth.ts
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        })
        
        if (!user || !user.password) return null
        
        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        
        if (!isValid) return null
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      if (token.role) {
        session.user.role = token.role
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
  }
})
```

## 4. tRPC Setup

```typescript
// src/lib/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function createTRPCContext() {
  const session = await auth()
  
  return {
    session,
    prisma,
    user: session?.user ?? null,
  }
}

const t = initTRPC.context<typeof createTRPCContext>().create()

const requireAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  
  return next({
    ctx: {
      ...ctx,
      user: ctx.session.user,
    },
  })
})

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(requireAuth)

// Schemas
export const scriptUploadSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  content: z.string().min(1),
  category: z.string().optional(),
})

// Main router
export const appRouter = router({
  scripts: {
    list: protectedProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const { page, limit, search } = input
        
        const where = {
          userId: ctx.user.id,
          ...(search && {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ]
          })
        }
        
        const [scripts, total] = await Promise.all([
          ctx.prisma.script.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: 'desc' },
          }),
          ctx.prisma.script.count({ where })
        ])
        
        return { scripts, total, pages: Math.ceil(total / limit) }
      }),
      
    create: protectedProcedure
      .input(scriptUploadSchema)
      .mutation(async ({ input, ctx }) => {
        const hash = await generateScriptHash(input.content)
        
        return ctx.prisma.script.create({
          data: {
            ...input,
            hash,
            userId: ctx.user.id,
          }
        })
      }),
      
    byId: protectedProcedure
      .input(z.string())
      .query(async ({ input, ctx }) => {
        const script = await ctx.prisma.script.findFirst({
          where: {
            id: input,
            userId: ctx.user.id,
          }
        })
        
        if (!script) {
          throw new TRPCError({ code: 'NOT_FOUND' })
        }
        
        return script
      }),
  }
})

export type AppRouter = typeof appRouter

// Helper function
async function generateScriptHash(content: string): Promise<string> {
  const crypto = await import('crypto')
  return crypto.createHash('sha256').update(content).digest('hex')
}
```

## 5. Client-side tRPC Setup

```typescript
// src/lib/trpc-client.ts
'use client'

import { createTRPCReact } from '@trpc/react-query'
import { type AppRouter } from '@/lib/trpc'

export const trpc = createTRPCReact<AppRouter>()
```

```typescript
// src/components/providers/trpc-provider.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  }))
  
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}
```

## 6. Modern App Layout

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Toaster } from 'sonner'
import { TRPCProvider } from '@/components/providers/trpc-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { AuthProvider } from '@/components/providers/auth-provider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PSScript - Modern PowerShell Management',
  description: 'AI-powered PowerShell script management platform built with Next.js 15',
  keywords: ['PowerShell', 'Scripts', 'AI', 'Management', 'Automation'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <TRPCProvider>
          <ThemeProvider>
            <AuthProvider>
              {children}
              <Toaster richColors position="top-right" />
            </AuthProvider>
          </ThemeProvider>
        </TRPCProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

## 7. Dashboard Page Example

```typescript
// src/app/dashboard/page.tsx
import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScriptsList } from '@/components/scripts-list'
import { DashboardStats } from '@/components/dashboard-stats'
import { CreateScript } from '@/components/create-script'

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session.user.name || session.user.email}
          </p>
        </div>
        <CreateScript />
      </div>
      
      <Suspense fallback={<DashboardStats.Skeleton />}>
        <DashboardStats />
      </Suspense>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Scripts</CardTitle>
          <CardDescription>
            Your latest PowerShell scripts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ScriptsList.Skeleton />}>
            <ScriptsList />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
```

## 8. API Route Handler

```typescript
// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter, createTRPCContext } from '@/lib/trpc'

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
  })

export { handler as GET, handler as POST }
```

## 9. Component Examples

```typescript
// src/components/scripts-list.tsx
'use client'

import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export function ScriptsList() {
  const { data, isLoading } = trpc.scripts.list.useQuery({
    page: 1,
    limit: 10,
  })

  if (isLoading) return <ScriptsList.Skeleton />

  return (
    <div className="space-y-4">
      {data?.scripts.map((script) => (
        <Card key={script.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{script.name}</CardTitle>
              {script.category && (
                <Badge variant="secondary">{script.category}</Badge>
              )}
            </div>
            {script.description && (
              <CardDescription>{script.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xs text-muted-foreground">
              Created {new Date(script.createdAt).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

ScriptsList.Skeleton = function SkeletonLoader() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
```

## 10. Development Commands

```bash
# Setup database
npx prisma generate
npx prisma db push

# Development
npm run dev

# Build for production
npm run build
npm run start

# Database operations
npx prisma studio           # Visual database editor
npx prisma db seed         # Seed database
npx prisma migrate dev     # Create and apply migration
```

## Migration from Current PSScript

```bash
# Create migration script
# migrate-to-nextjs.js

const fs = require('fs').promises
const path = require('path')

async function migrateScripts() {
  // Read existing scripts from current backend
  const scriptsData = await fetch('http://localhost:4000/api/scripts')
  const scripts = await scriptsData.json()
  
  // Transform and import to new Prisma database
  for (const script of scripts) {
    await prisma.script.create({
      data: {
        name: script.name,
        content: script.content,
        description: script.description,
        category: script.category,
        hash: generateHash(script.content),
        // Link to migrated user account
        userId: 'migrated-user-id',
      }
    })
  }
}
```

This starter kit provides a complete foundation for building the modern PSScript application using 2025 best practices with Next.js 15, TypeScript, and the latest security and performance optimizations.