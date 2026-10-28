#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const VERSION = '0.1.0';

const args = process.argv.slice(2);
const command = args[0];

const BANNER = `
  \x1b[36m█ █ █▀▀ █▀▀▄ █▀▀▄ █▀▀█ █\x1b[0m
  \x1b[36m▀▄▄▀ █▀▀ █ █ █ █ █▄▄█ █\x1b[0m
  \x1b[36m  ▄ ▀▀▀ ▀ ▀ ▀ ▀ ▀ ▀ ▀▀▀▀\x1b[0m
  \x1b[1mVennQL Developer CLI (v${VERSION})\x1b[0m
  Zero-Copy, High-Throughput Binary API Framework
`;

function printHelp() {
  console.log(BANNER);
  console.log(`
Usage:
  vennql <command> [options]

Commands:
  init [dir]       Scaffold a new VennQL application workspace
  dev              Start local VennQL development engine
  bench            Run zero-copy in-memory and network benchmark suite
  check            Verify procedure contracts and schema integrity
  --version, -v    Print CLI version
  --help, -h       Print this help message

Examples:
  npx vennql init my-app
  cd my-app && vennql dev
`);
}

function handleInit(targetDirName) {
  console.log(BANNER);
  const targetDir = targetDirName || 'vennql-starter';
  const targetPath = path.resolve(process.cwd(), targetDir);

  if (fs.existsSync(targetPath)) {
    console.error(`\x1b[31mError:\x1b[0m Directory '${targetDir}' already exists.`);
    process.exit(1);
  }

  console.log(`\x1b[34m[VennQL]\x1b[0m Scaffolding new high-velocity project in ${targetPath}...`);
  fs.mkdirSync(targetPath, { recursive: true });

  const config = {
    name: targetDir,
    version: '0.1.0',
    protocol: {
      version: 1,
      magic: '0x56',
      wire: 'binary',
      transport: ['websocket', 'webtransport'],
    },
    procedures: {
      1: { name: 'health', type: 'query', cacheable: true },
      2: { name: 'echo', type: 'mutate', cacheable: false },
      10: { name: 'getUser', type: 'query', cacheable: true },
    },
    server: {
      host: '127.0.0.1',
      port: 8080,
    },
  };
  fs.writeFileSync(
    path.join(targetPath, 'vennql.config.json'),
    JSON.stringify(config, null, 2)
  );

  const pkg = {
    name: targetDir,
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'node index.js',
      bench: 'vennql bench',
    },
    dependencies: {
      '@vennql/client': '^0.1.0',
    },
  };
  fs.writeFileSync(path.join(targetPath, 'package.json'), JSON.stringify(pkg, null, 2));

  const clientCode = `// VennQL Client Demonstration
const { VennClient, OpCode } = require('@vennql/client');

async function main() {
  const client = new VennClient();
  console.log('Connecting to VennQL engine on ws://127.0.0.1:8080...');
  await client.connect('ws://127.0.0.1:8080');

  const pingMs = await client.ping();
  console.log(\`⚡ Round-trip ping latency: \${pingMs.toFixed(3)} ms\`);

  const health = await client.query(1);
  console.log('✔ Health query result:', health);

  const user = await client.query(10, 'usr_998822');
  console.log('✔ User profile result:', user);

  client.close();
}

main().catch(console.error);
`;
  fs.writeFileSync(path.join(targetPath, 'index.js'), clientCode);

  console.log(`\x1b[32m✔ Project initialized successfully!\x1b[0m\n`);
  console.log(`Next steps:\n  cd ${targetDir}\n  npm install\n  npm run dev\n`);
}

function handleBench() {
  console.log(BANNER);
  console.log('\x1b[34m[VennQL]\x1b[0m Executing native Rust zero-copy microbenchmark...\n');
  const child = spawn('cargo', ['run', '--release', '-p', 'benchmark-service'], {
    stdio: 'inherit',
    shell: true,
  });
  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

function handleDev() {
  console.log(BANNER);
  console.log('\x1b[34m[VennQL]\x1b[0m Launching VennQL binary engine...\n');
  const child = spawn('cargo', ['run', '-p', 'vennql-server'], {
    stdio: 'inherit',
    shell: true,
  });
  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

switch (command) {
  case 'init':
    handleInit(args[1]);
    break;
  case 'bench':
    handleBench();
    break;
  case 'dev':
    handleDev();
    break;
  case '--version':
  case '-v':
    console.log(`v${VERSION}`);
    break;
  case '--help':
  case '-h':
  case undefined:
    printHelp();
    break;
  default:
    console.error(`\x1b[31mUnknown command:\x1b[0m ${command}`);
    printHelp();
    process.exit(1);
}
