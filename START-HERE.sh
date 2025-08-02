#!/bin/bash

# PSScript Blazing Fast Setup - Watch This Magic 🔥

echo "🔥 PSScript Blazing Fast Setup"
echo "=============================="
echo "Killing your old bloated setup..."
echo ""

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "📦 Installing Bun (the Node.js killer)..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
else
    echo "✅ Bun already installed"
fi

echo ""
echo "🚀 Creating PSScript Blazing..."

# Create the project
bun create hono psscript-blazing
cd psscript-blazing

echo ""
echo "📦 Installing dependencies..."

# Install all dependencies in one shot
bun add hono @hono/node-server drizzle-orm drizzle-kit @libsql/client lucia @lucia-auth/adapter-drizzle bcryptjs nanoid
bun add -d @types/bcryptjs tailwindcss daisyui

echo ""
echo "🏗️ Creating project structure..."

# Create directories
mkdir -p src/{routes,db} public drizzle/migrations

echo ""
echo "✨ Creating files..."
echo ""
echo "Done! Now run:"
echo ""
echo "  cd psscript-blazing"
echo "  bun run dev"
echo ""
echo "Your app will be running at http://localhost:3000 🔥"
echo ""
echo "Next steps:"
echo "1. Copy the code from ZERO-BULLSHIT-IMPLEMENTATION.md"
echo "2. Run 'bun run db:migrate' to setup database"
echo "3. Open http://localhost:3000 and watch it fly"
echo ""
echo "For AI features:"
echo "  curl -fsSL https://ollama.ai/install.sh | sh"
echo "  ollama pull codellama:7b"