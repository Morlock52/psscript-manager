# Claude Flow Swarm Mode - PSScript

A multi-agent swarm system with persistent memory has been configured for your PSScript project.

## Quick Start

```bash
# Basic swarm analysis with 5 agents and persistent memory
claude-flow swarm --agents 5 --memory persistent

# Analyze codebase with swarm
claude-flow swarm analyze --agents 5 --memory persistent

# Collaborative feature development
claude-flow swarm develop --feature "voice-command-api" --agents 5 --memory persistent

# Refactor with swarm intelligence
claude-flow swarm refactor --target "src/backend/controllers" --agents 5 --memory persistent

# Learn from codebase and build knowledge
claude-flow swarm learn --agents 5 --memory persistent
```

## Architecture

### Agent Roles (5 agents total)

1. **Orchestrator (1 agent)**
   - Coordinates all other agents
   - Manages task distribution
   - Aggregates results
   - Handles conflict resolution

2. **Analyzers (2 agents)**
   - Agent 1: PowerShell security specialist
   - Agent 2: TypeScript patterns expert
   - Perform code analysis and scanning

3. **Developer (1 agent)**
   - Generates code
   - Fixes bugs
   - Performs refactoring

4. **Reviewer (1 agent)**
   - Reviews code changes
   - Validates best practices
   - Updates documentation

### Persistent Memory System

The swarm uses a sophisticated memory system:

```
Memory Pools:
├── Global (50MB)      - Shared knowledge across all agents
├── Task (20MB)        - Current task context and progress
├── Agent (10MB each)  - Individual agent working memory
└── Results (30MB)     - Aggregated findings and outcomes
```

### Memory Features

- **Persistence**: Memory survives between swarm sessions
- **Synchronization**: Eventual consistency with 1-second sync intervals
- **Deduplication**: Automatic removal of duplicate memories
- **Compression**: LZ4 compression for efficient storage
- **Indexing**: Multiple index types for fast retrieval:
  - File paths (B-tree)
  - Function names (Inverted index)
  - Semantic content (Vector index)
  - Dependency graph (Graph index)
  - Temporal data (Time-series)

## Memory Management Commands

```bash
# Check memory status
claude-flow memory status

# Search memories
claude-flow memory search "security vulnerability"

# Recall relevant memories for context
claude-flow memory recall "implement authentication"

# Clean old memories (dry run by default)
claude-flow memory clean --days 30

# Export memories
claude-flow memory export --format json

# Generate memory summary
claude-flow memory summary
```

## Swarm Communication

Agents communicate through:
- **Broadcast Channel**: All agents receive updates
- **Direct Messages**: Point-to-point communication
- **Pub/Sub Topics**: 
  - `code_analysis`
  - `security_alerts`
  - `task_updates`
  - `memory_sync`

## Performance Optimization

- **Load Balancing**: Weighted round-robin task distribution
- **Auto-scaling**: 3-10 agents based on workload
- **Caching**: Result and analysis caching
- **Parallel Execution**: Up to 10 concurrent tasks

## Fault Tolerance

- **Agent Failure**: Automatic task reassignment
- **Memory Corruption**: Restore from backup
- **Deadlock Detection**: Communication reset
- **Heartbeat Monitoring**: 5-second intervals

## Use Cases

### 1. Security Audit
```bash
claude-flow swarm analyze --agents 5 --memory persistent
```
Swarm performs distributed security analysis across your PowerShell scripts.

### 2. Feature Development
```bash
claude-flow swarm develop --feature "batch-script-processing" --agents 5
```
Agents collaborate to design, implement, test, and document new features.

### 3. Codebase Learning
```bash
claude-flow swarm learn --agents 5 --memory persistent
```
Builds comprehensive knowledge base of patterns, conventions, and relationships.

### 4. Intelligent Refactoring
```bash
claude-flow swarm refactor --target "legacy-code" --agents 5
```
Swarm analyzes and refactors code while maintaining functionality.

## Best Practices

1. **Always use persistent memory** for long-term projects
2. **Run learning tasks periodically** to keep knowledge current
3. **Monitor swarm health** during long-running tasks
4. **Export memories regularly** for backup
5. **Clean old memories monthly** to maintain performance

## Troubleshooting

- **Agent timeout**: Increase timeout in `swarm.yaml`
- **Memory full**: Run memory clean or increase pool sizes
- **Communication deadlock**: Check pubsub topic subscriptions
- **Slow performance**: Review memory indexes and enable caching

## Next Steps

1. Run initial learning: `claude-flow swarm learn`
2. Perform security audit: `claude-flow swarm analyze`
3. Check memory status: `claude-flow memory status`
4. Review generated insights in `.claude-flow/memory/summaries/`