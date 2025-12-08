#!/usr/bin/env node

/**
 * JSON Root Attribute Size Analyzer
 * Shows the size (in bytes) of each root-level attribute in a JSON file
 */

const fs = require('fs');
const path = require('path');

// Configuration
const inputFile = process.argv[2] || path.join(__dirname, '8be27667-351e-462e-a0a1-2a17d6ddc644.json');

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatPercent(part, total) {
  return ((part / total) * 100).toFixed(2) + '%';
}

// Main execution
console.log(`Reading JSON file: ${inputFile}\n`);
const jsonContent = fs.readFileSync(inputFile, 'utf8');
const totalSize = Buffer.byteLength(jsonContent, 'utf8');
console.log(`Total file size: ${formatBytes(totalSize)}\n`);

console.log('Parsing JSON...');
const jsonData = JSON.parse(jsonContent);

console.log('Analyzing root attribute sizes...\n');

const results = [];

for (const key of Object.keys(jsonData)) {
  const value = jsonData[key];
  const serialized = JSON.stringify(value);
  const size = Buffer.byteLength(serialized, 'utf8');
  
  let info = '';
  if (Array.isArray(value)) {
    info = `array[${value.length}]`;
  } else if (value === null) {
    info = 'null';
  } else if (typeof value === 'object') {
    info = `object{${Object.keys(value).length} keys}`;
  } else {
    info = typeof value;
  }
  
  results.push({ key, size, info });
}

// Sort by size descending
results.sort((a, b) => b.size - a.size);

// Calculate minified total (sum of all serialized values)
const minifiedTotal = results.reduce((sum, r) => sum + r.size, 0);
const overhead = totalSize - minifiedTotal;

// Print results
console.log('Root Attribute Sizes (sorted by size):');
console.log('─'.repeat(70));
console.log(
  'Attribute'.padEnd(30) + 
  'Size'.padStart(12) + 
  '% of Data'.padStart(10) + 
  'Type'.padStart(18)
);
console.log('─'.repeat(70));

for (const { key, size, info } of results) {
  console.log(
    key.padEnd(30) + 
    formatBytes(size).padStart(12) + 
    formatPercent(size, minifiedTotal).padStart(10) + 
    info.padStart(18)
  );
}

console.log('─'.repeat(70));
console.log(
  'Data subtotal'.padEnd(30) + 
  formatBytes(minifiedTotal).padStart(12) + 
  '100.00%'.padStart(10)
);
console.log(
  'Formatting overhead'.padEnd(30) + 
  formatBytes(overhead).padStart(12) + 
  formatPercent(overhead, totalSize).padStart(10) +
  '(whitespace)'.padStart(18)
);
console.log('─'.repeat(70));
console.log(
  'TOTAL FILE SIZE'.padEnd(30) + 
  formatBytes(totalSize).padStart(12)
);

