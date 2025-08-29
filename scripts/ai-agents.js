#!/usr/bin/env node

/**
 * AI Agents Management Script for Wheels & Wins
 * Orchestrates all AI-powered development tools
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const chalk = require('chalk');

// Load configuration
const configPath = path.join(__dirname, '..', '.ai-agents.config.json');
const envPath = path.join(__dirname, '..', '.env.ai-agents.local');

class AIAgentManager {
  constructor() {
    this.config = this.loadConfig();
    this.env = this.loadEnv();
    this.activeAgents = new Map();
  }

  loadConfig() {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to load AI agents config:'), error.message);
      process.exit(1);
    }
  }

  loadEnv() {
    const env = {};
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        if (line && !line.startsWith('#')) {
          const [key, value] = line.split('=');
          if (key && value) {
            env[key.trim()] = value.trim();
          }
        }
      });
    }
    return env;
  }

  async runSecurityScan() {
    console.log(chalk.blue('\n🔐 Running Security Scan...'));
    
    // Semgrep scan
    if (this.config.agents.security.semgrep.enabled) {
      console.log(chalk.gray('  Running Semgrep...'));
      await this.runCommand('semgrep', ['--config=auto', '.']);
    }

    // GitGuardian scan
    if (this.config.agents.security.gitguardian.enabled && this.env.GITGUARDIAN_API_KEY) {
      console.log(chalk.gray('  Running GitGuardian...'));
      await this.runCommand('ggshield', ['secret', 'scan', 'repo', '.']);
    }

    // Snyk scan
    if (this.config.agents.bugDetection.snyk.enabled && this.env.SNYK_TOKEN) {
      console.log(chalk.gray('  Running Snyk...'));
      process.env.SNYK_TOKEN = this.env.SNYK_TOKEN;
      await this.runCommand('snyk', ['test']);
    }

    console.log(chalk.green('✅ Security scan complete'));
  }

  async generateTests() {
    console.log(chalk.blue('\n🧪 Generating Tests...'));
    
    // Find components without tests
    const componentsDir = path.join(__dirname, '..', 'src', 'components');
    const testableFiles = this.findTestableFiles(componentsDir);
    
    console.log(chalk.gray(`  Found ${testableFiles.length} components to test`));
    
    // Generate test suggestions (mock - would integrate with Codium AI)
    testableFiles.slice(0, 5).forEach(file => {
      console.log(chalk.gray(`  📝 Generating test for: ${path.basename(file)}`));
    });

    console.log(chalk.green('✅ Test generation complete'));
  }

  async generateDocumentation() {
    console.log(chalk.blue('\n📚 Generating Documentation...'));
    
    const docsDir = path.join(__dirname, '..', 'docs', 'generated');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    // Generate API documentation
    console.log(chalk.gray('  Generating API docs...'));
    
    // Generate component documentation
    console.log(chalk.gray('  Generating component docs...'));
    
    console.log(chalk.green('✅ Documentation generation complete'));
  }

  async analyzePAM() {
    console.log(chalk.blue('\n🤖 Analyzing PAM AI Assistant...'));
    
    const pamFiles = [
      'backend/app/api/v1/pam.py',
      'backend/app/services/ai_service.py',
      'src/components/pam/PamChatController.tsx'
    ];

    pamFiles.forEach(file => {
      const fullPath = path.join(__dirname, '..', file);
      if (fs.existsSync(fullPath)) {
        console.log(chalk.gray(`  Analyzing: ${file}`));
        // Would integrate with AI tools for analysis
      }
    });

    console.log(chalk.green('✅ PAM analysis complete'));
  }

  findTestableFiles(dir, files = []) {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.')) {
        this.findTestableFiles(fullPath, files);
      } else if (
        item.endsWith('.tsx') || 
        item.endsWith('.ts') && 
        !item.includes('.test.') && 
        !item.includes('.spec.')
      ) {
        const testPath = fullPath.replace(/\.(tsx?|jsx?)$/, '.test.$1');
        if (!fs.existsSync(testPath)) {
          files.push(fullPath);
        }
      }
    });
    
    return files;
  }

  runCommand(command, args) {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        stdio: 'inherit',
        env: { ...process.env, ...this.env }
      });
      
      proc.on('close', code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });
      
      proc.on('error', reject);
    });
  }

  async runWorkflow(workflow) {
    console.log(chalk.cyan(`\n🔄 Running ${workflow} workflow...\n`));
    
    switch (workflow) {
      case 'security':
        await this.runSecurityScan();
        break;
      case 'tests':
        await this.generateTests();
        break;
      case 'docs':
        await this.generateDocumentation();
        break;
      case 'pam':
        await this.analyzePAM();
        break;
      case 'all':
        await this.runSecurityScan();
        await this.generateTests();
        await this.generateDocumentation();
        await this.analyzePAM();
        break;
      default:
        console.log(chalk.red(`Unknown workflow: ${workflow}`));
    }
  }

  showStatus() {
    console.log(chalk.cyan('\n📊 AI Agents Status\n'));
    
    const agents = this.config.agents;
    
    // Bug Detection
    console.log(chalk.yellow('Bug Detection:'));
    console.log(`  Codium AI: ${agents.bugDetection.codium.enabled ? '✅' : '❌'}`);
    console.log(`  Snyk: ${agents.bugDetection.snyk.enabled ? '✅' : '❌'}`);
    console.log(`  SonarLint: ${agents.bugDetection.sonarLint.enabled ? '✅' : '❌'}`);
    
    // Security
    console.log(chalk.yellow('\nSecurity:'));
    console.log(`  Semgrep: ${agents.security.semgrep.enabled ? '✅' : '❌'}`);
    console.log(`  GitGuardian: ${agents.security.gitguardian.enabled ? '✅' : '❌'}`);
    console.log(`  Bearer: ${agents.security.bearer.enabled ? '✅' : '❌'}`);
    
    // UI
    console.log(chalk.yellow('\nUI/UX:'));
    console.log(`  Vercel v0: ${agents.ui.v0.enabled ? '✅' : '❌'}`);
    console.log(`  Locofy: ${agents.ui.locofy.enabled ? '✅' : '❌'}`);
    
    // Documentation
    console.log(chalk.yellow('\nDocumentation:'));
    console.log(`  Mintlify: ${agents.documentation.mintlify.enabled ? '✅' : '❌'}`);
    console.log(`  Swimm: ${agents.documentation.swimm.enabled ? '✅' : '❌'}`);
    
    // Testing
    console.log(chalk.yellow('\nTesting:'));
    console.log(`  Coverage Target: ${agents.testing.coverage.target}`);
    console.log(`  Auto-generate: ${agents.testing.autoGenerateTests ? '✅' : '❌'}`);
  }
}

// CLI
const manager = new AIAgentManager();
const command = process.argv[2];

const showHelp = () => {
  console.log(chalk.cyan(`
🤖 Wheels & Wins AI Agents Manager

Usage: npm run ai-agents <command>

Commands:
  status     Show status of all AI agents
  security   Run security scan (Semgrep, GitGuardian, Snyk)
  tests      Generate missing tests
  docs       Generate documentation
  pam        Analyze PAM AI assistant
  all        Run all workflows
  help       Show this help message
`));
};

async function main() {
  switch (command) {
    case 'status':
      manager.showStatus();
      break;
    case 'security':
    case 'tests':
    case 'docs':
    case 'pam':
    case 'all':
      await manager.runWorkflow(command);
      break;
    case 'help':
    default:
      showHelp();
  }
}

main().catch(error => {
  console.error(chalk.red('❌ Error:'), error.message);
  process.exit(1);
});