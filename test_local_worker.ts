import { createWorker } from 'tesseract.js';
import path from 'path';

async function testLocalWorker() {
  const cwd = process.cwd();
  console.log("CWD:", cwd);
  console.log("Testing createWorker with local langPath ...");
  const startTime = Date.now();

  const worker = await createWorker('vie+eng', 1, {
    langPath: cwd,
    cachePath: cwd,
  });

  console.log(`Worker created in ${Date.now() - startTime}ms!`);
  await worker.terminate();
}

testLocalWorker().catch(console.error);
