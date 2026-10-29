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
  codegen          Compile schema contracts into TypeScript & Python stubs
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

function handleCheck(customPath) {
  console.log(BANNER);
  const configPath = customPath ? path.resolve(process.cwd(), customPath) : path.join(process.cwd(), 'vennql.config.json');

  if (!fs.existsSync(configPath)) {
    console.error(`\x1b[31mError:\x1b[0m Config file not found at ${configPath}`);
    console.log(`Run \x1b[34mvennql init\x1b[0m to scaffold a new project.`);
    process.exit(1);
  }

  console.log(`\x1b[34m[VennQL]\x1b[0m Validating schema contracts in ${path.basename(configPath)}...\n`);
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error(`\x1b[31mSyntax Error:\x1b[0m Failed to parse ${configPath}: ${err.message}`);
    process.exit(1);
  }

  let errors = [];
  let warnings = [];

  // 1. Protocol checks
  if (!config.protocol) {
    errors.push("Missing 'protocol' block in configuration.");
  } else {
    if (config.protocol.version !== 1) {
      errors.push(`Unsupported protocol version: ${config.protocol.version}. Expected 1.`);
    }
    const magic = String(config.protocol.magic).toLowerCase();
    if (magic !== '0x56' && magic !== '86') {
      errors.push(`Invalid magic byte declaration: ${config.protocol.magic}. Expected 0x56.`);
    }
  }

  // 2. Procedure contract checks
  if (!config.procedures || typeof config.procedures !== 'object') {
    errors.push("Missing or invalid 'procedures' dictionary.");
  } else {
    const ids = new Set();
    const names = new Set();

    console.log('\x1b[1mRegistered Procedures Contract Audit:\x1b[0m');
    console.log('------------------------------------------------------------');
    console.log(' ID    | Procedure Name       | Type    | Cacheable | Status');
    console.log('------------------------------------------------------------');

    for (const [idStr, proc] of Object.entries(config.procedures)) {
      const id = parseInt(idStr, 10);
      if (isNaN(id) || id < 1 || id > 65535) {
        errors.push(`Invalid procedure ID '${idStr}'. Must be an unsigned 16-bit integer (1-65535).`);
      }
      if (ids.has(id)) {
        errors.push(`Duplicate procedure ID: ${id}`);
      }
      ids.add(id);

      if (!proc.name || typeof proc.name !== 'string') {
        errors.push(`Procedure #${id} is missing a valid 'name'.`);
      } else {
        if (names.has(proc.name)) {
          errors.push(`Duplicate procedure name: '${proc.name}' on ID ${id}`);
        }
        names.add(proc.name);
      }

      const validTypes = ['query', 'mutate', 'stream'];
      const pType = (proc.type || '').toLowerCase();
      if (!validTypes.includes(pType)) {
        errors.push(`Procedure #${id} ('${proc.name}') has invalid type '${proc.type}'. Expected one of: ${validTypes.join(', ')}`);
      }

      const cacheable = Boolean(proc.cacheable);
      if (pType === 'mutate' && cacheable) {
        warnings.push(`Procedure #${id} ('${proc.name}') is a 'mutate' but marked 'cacheable: true'. Mutations should not be cached.`);
      }

      const padId = String(id).padEnd(5);
      const padName = (proc.name || 'unnamed').padEnd(20);
      const padType = pType.padEnd(7);
      const padCache = (cacheable ? 'YES' : 'NO').padEnd(9);
      console.log(` #${padId} | ${padName} | ${padType} | ${padCache} | \x1b[32mPASSED\x1b[0m`);
    }
    console.log('------------------------------------------------------------\n');
  }

  if (warnings.length > 0) {
    console.log('\x1b[33mContract Warnings:\x1b[0m');
    warnings.forEach((w) => console.log(` • \x1b[33m${w}\x1b[0m`));
    console.log('');
  }

  if (errors.length > 0) {
    console.log('\x1b[31mContract Errors Detected:\x1b[0m');
    errors.forEach((e) => console.log(` ✖ \x1b[31m${e}\x1b[0m`));
    console.log(`\n\x1b[31mFAILED:\x1b[0m ${errors.length} contract error(s) must be resolved.`);
    process.exit(1);
  } else {
    console.log(`\x1b[32m✔ SUCCESS:\x1b[0m All procedure contracts and schema integrity checks passed without error!`);
  }
}

function handleCodegen(customPath) {
  console.log(BANNER);
  const configPath = customPath ? path.resolve(process.cwd(), customPath) : path.join(process.cwd(), 'vennql.config.json');

  if (!fs.existsSync(configPath)) {
    console.error(`\x1b[31mError:\x1b[0m Config file not found at ${configPath}`);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log(`\x1b[34m[VennQL Codegen]\x1b[0m Compiling schema definitions into polyglot client stubs...\n`);

  // Generate TypeScript Definitions
  let tsOutput = `// Auto-generated by VennQL CLI (vennql codegen)
// Schema: ${config.name || 'VennQL API'} v${config.version || '0.1.0'}
// Do not edit this file directly.

export const Procedures = {\n`;

  for (const [id, proc] of Object.entries(config.procedures || {})) {
    tsOutput += `  ${proc.name}: ${id},\n`;
  }
  tsOutput += `} as const;\n\nexport type ProcedureName = keyof typeof Procedures;\n`;

  const tsFile = path.join(path.dirname(configPath), 'vennql.generated.ts');
  fs.writeFileSync(tsFile, tsOutput, 'utf8');
  console.log(` ✔ Generated TypeScript stubs : \x1b[32m${path.basename(tsFile)}\x1b[0m`);

  // Generate Python Definitions
  let pyOutput = `# Auto-generated by VennQL CLI (vennql codegen)
# Schema: ${config.name || 'VennQL API'} v${config.version || '0.1.0'}
# Do not edit this file directly.

from enum import IntEnum

class Procedure(IntEnum):
`;
  for (const [id, proc] of Object.entries(config.procedures || {})) {
    const pyName = proc.name.toUpperCase();
    pyOutput += `    ${pyName} = ${id}\n`;
  }

  const pyFile = path.join(path.dirname(configPath), 'vennql_generated.py');
  fs.writeFileSync(pyFile, pyOutput, 'utf8');
  console.log(` ✔ Generated Python bindings   : \x1b[32m${path.basename(pyFile)}\x1b[0m`);
  console.log(`\n\x1b[32mDone!\x1b[0m Type-safe contracts successfully generated.`);
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
  case 'check':
    handleCheck(args[1]);
    break;
  case 'codegen':
    handleCodegen(args[1]);
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
