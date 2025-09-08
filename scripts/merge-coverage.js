#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const frontend = join(root, 'coverage', 'frontend', 'lcov.info');
const server = join(root, 'coverage', 'server', 'lcov.info');
const outDir = join(root, 'coverage');
const outFile = join(outDir, 'lcov.info');

let parts = [];
if (existsSync(frontend)) parts.push(readFileSync(frontend, 'utf8'));
if (existsSync(server)) parts.push(readFileSync(server, 'utf8'));

if (!parts.length) {
  console.error('No coverage files found to merge.');
  process.exit(1);
}

const merged = parts.join('\n');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, merged, 'utf8');
console.log('Merged coverage written to', outFile);
