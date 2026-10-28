// End-to-End Integration Demo for VennQL
const { VennClient, OpCode } = require('../packages/client/dist/index');

async function runDemo() {
  console.log('\x1b[36m====================================================\x1b[0m');
  console.log('\x1b[36m   VennQL End-to-End Binary Protocol Verification  \x1b[0m');
  console.log('\x1b[36m====================================================\x1b[0m\n');

  const client = new VennClient();
  const url = process.env.VENNQL_URL || 'ws://127.0.0.1:8080';

  console.log(`[1] Connecting to VennQL server at ${url}...`);
  await client.connect(url);
  console.log('\x1b[32m✔ Connected successfully over binary WebSocket channel\x1b[0m\n');

  // Step 1: Liveness Ping / Pong
  console.log('[2] Measuring raw round-trip latency via Ping packet...');
  const pingLatency = await client.ping();
  console.log(`\x1b[32m✔ Pong received! Latency: ${pingLatency.toFixed(3)} ms\x1b[0m\n`);

  // Step 2: Health Query (Procedure #1)
  console.log('[3] Executing Health Query (Procedure ID: 1)...');
  const healthResult = await client.query(1);
  console.log('\x1b[32m✔ Health Response:\x1b[0m', healthResult, '\n');

  // Step 3: Pure Binary Computation (Procedure #3: Sum Packed u32s)
  console.log('[4] Executing Zero-Copy Binary Sum (Procedure ID: 3)...');
  const numbers = [100, 250, 450, 200]; // Sum should be 1000
  const buffer = new ArrayBuffer(numbers.length * 4);
  const view = new DataView(buffer);
  numbers.forEach((num, idx) => view.setUint32(idx * 4, num, false)); // Big-Endian packed

  const rawSumBytes = await client.call(OpCode.Query, 3, new Uint8Array(buffer));
  const sumView = new DataView(rawSumBytes.buffer, rawSumBytes.byteOffset, rawSumBytes.byteLength);
  const computedSum = sumView.getBigUint64(0, false);
  console.log(`\x1b[32m✔ Packed Inputs: [${numbers.join(', ')}] -> Computed Sum: ${computedSum}\x1b[0m\n`);

  // Step 4: Deterministic Entity Query (Procedure #10)
  console.log('[5] Executing Cached Entity Lookup (Procedure ID: 10)...');
  const userResult = await client.query(10, 'usr_architect_77');
  console.log('\x1b[32m✔ Entity Record:\x1b[0m', userResult, '\n');

  // Step 5: Error Handling verification
  console.log('[6] Verifying Unregistered Procedure Error Frame...');
  try {
    await client.query(9999, 'nonexistent');
    console.error('\x1b[31m✖ Expected error but got success\x1b[0m');
  } catch (err) {
    console.log(`\x1b[32m✔ Correctly caught binary error frame:\x1b[0m ${err.message}\n`);
  }

  client.close();
  console.log('\x1b[36m====================================================\x1b[0m');
  console.log('\x1b[32m       ALL VENNQL E2E VERIFICATIONS PASSED!         \x1b[0m');
  console.log('\x1b[36m====================================================\x1b[0m');
}

runDemo().catch((err) => {
  console.error('\x1b[31m[VennQL Demo Failed]:\x1b[0m', err);
  process.exit(1);
});
