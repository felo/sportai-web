#!/usr/bin/env node

/**
 * JSON Structure Analyzer
 * Analyzes a JSON file and generates a markdown documentation of its structure
 */

const fs = require('fs');
const path = require('path');

// Configuration
const inputFile = process.argv[2] || path.join(__dirname, '8be27667-351e-462e-a0a1-2a17d6ddc644.json');
const outputFile = process.argv[3] || path.join(__dirname, 'json-structure.md');

/**
 * Get the type of a value with more detail
 */
function getDetailedType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'array (empty)';
    const itemTypes = [...new Set(value.slice(0, 10).map(getDetailedType))];
    return `array<${itemTypes.join(' | ')}>`;
  }
  if (typeof value === 'object') return 'object';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'float';
  }
  return typeof value;
}

/**
 * Collect all unique paths and their types from a JSON structure
 */
function analyzeStructure(obj, path = '', results = new Map()) {
  if (obj === null || obj === undefined) {
    addResult(results, path, 'null', null);
    return results;
  }

  if (Array.isArray(obj)) {
    const arrayInfo = {
      length: obj.length,
      itemTypes: new Set()
    };
    
    // Sample items to understand array content
    const sampleSize = Math.min(obj.length, 20);
    for (let i = 0; i < sampleSize; i++) {
      const item = obj[i];
      arrayInfo.itemTypes.add(getDetailedType(item));
      
      if (item !== null && typeof item === 'object') {
        analyzeStructure(item, `${path}[]`, results);
      }
    }
    
    addResult(results, path, 'array', arrayInfo);
    return results;
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    addResult(results, path, 'object', { keys: keys.length });
    
    for (const key of keys) {
      const newPath = path ? `${path}.${key}` : key;
      const value = obj[key];
      
      if (value === null) {
        addResult(results, newPath, 'null', null);
      } else if (Array.isArray(value)) {
        analyzeStructure(value, newPath, results);
      } else if (typeof value === 'object') {
        analyzeStructure(value, newPath, results);
      } else {
        addResult(results, newPath, getDetailedType(value), getSampleValue(value));
      }
    }
    
    return results;
  }

  addResult(results, path, getDetailedType(obj), getSampleValue(obj));
  return results;
}

/**
 * Add a result to the map, merging with existing info
 */
function addResult(results, path, type, extra) {
  if (!results.has(path)) {
    results.set(path, {
      types: new Set(),
      samples: [],
      arrayInfo: null,
      objectInfo: null
    });
  }
  
  const entry = results.get(path);
  entry.types.add(type);
  
  if (type === 'array' && extra) {
    if (!entry.arrayInfo) {
      entry.arrayInfo = { minLength: extra.length, maxLength: extra.length, itemTypes: new Set() };
    }
    entry.arrayInfo.minLength = Math.min(entry.arrayInfo.minLength, extra.length);
    entry.arrayInfo.maxLength = Math.max(entry.arrayInfo.maxLength, extra.length);
    extra.itemTypes.forEach(t => entry.arrayInfo.itemTypes.add(t));
  }
  
  if (extra !== null && typeof extra !== 'object' && entry.samples.length < 3) {
    if (!entry.samples.includes(extra)) {
      entry.samples.push(extra);
    }
  }
}

/**
 * Get a sample value (truncated if too long)
 */
function getSampleValue(value) {
  if (typeof value === 'string') {
    return value.length > 50 ? value.substring(0, 50) + '...' : value;
  }
  return value;
}

/**
 * Generate markdown documentation
 */
function generateMarkdown(results, jsonData) {
  let md = '# JSON Structure Documentation\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += '---\n\n';
  
  // Top-level summary
  md += '## Summary\n\n';
  const topKeys = Object.keys(jsonData);
  md += `Top-level properties: ${topKeys.length}\n\n`;
  md += '| Property | Type | Description |\n';
  md += '|----------|------|-------------|\n';
  
  for (const key of topKeys) {
    const entry = results.get(key);
    const type = [...entry.types].join(' | ');
    let desc = '';
    if (entry.arrayInfo) {
      desc = `Array with ${entry.arrayInfo.minLength}-${entry.arrayInfo.maxLength} items`;
    }
    md += `| \`${key}\` | ${type} | ${desc} |\n`;
  }
  
  md += '\n---\n\n';
  md += '## Full Property Hierarchy\n\n';
  
  // Group by top-level property
  const grouped = new Map();
  for (const [path, entry] of results) {
    const topLevel = path.split('.')[0].replace('[]', '');
    if (!grouped.has(topLevel)) {
      grouped.set(topLevel, []);
    }
    grouped.get(topLevel).push([path, entry]);
  }
  
  for (const [topLevel, entries] of grouped) {
    md += `### \`${topLevel}\`\n\n`;
    md += '| Path | Type(s) | Sample Values |\n';
    md += '|------|---------|---------------|\n';
    
    for (const [path, entry] of entries) {
      const types = [...entry.types].join(' \\| ');
      let samples = '';
      
      if (entry.arrayInfo) {
        samples = `length: ${entry.arrayInfo.minLength}-${entry.arrayInfo.maxLength}, items: ${[...entry.arrayInfo.itemTypes].join(', ')}`;
      } else if (entry.samples.length > 0) {
        samples = entry.samples.map(s => `\`${JSON.stringify(s)}\``).join(', ');
      }
      
      md += `| \`${path}\` | ${types} | ${samples} |\n`;
    }
    
    md += '\n';
  }
  
  // Add tree view
  md += '---\n\n';
  md += '## Tree View\n\n';
  md += '```\n';
  md += generateTreeView(results);
  md += '```\n';
  
  return md;
}

/**
 * Generate a tree view of the structure
 */
function generateTreeView(results) {
  const paths = [...results.keys()].sort();
  let tree = '';
  
  for (const path of paths) {
    const entry = results.get(path);
    const depth = (path.match(/\./g) || []).length;
    const indent = '  '.repeat(depth);
    const name = path.split('.').pop() || path;
    const types = [...entry.types].join(' | ');
    
    let extra = '';
    if (entry.arrayInfo) {
      extra = ` [${entry.arrayInfo.minLength}-${entry.arrayInfo.maxLength} items]`;
    }
    
    tree += `${indent}├─ ${name}: ${types}${extra}\n`;
  }
  
  return tree;
}

// Main execution
console.log(`Reading JSON file: ${inputFile}`);
const jsonContent = fs.readFileSync(inputFile, 'utf8');
console.log(`Parsing JSON (${(jsonContent.length / 1024 / 1024).toFixed(2)} MB)...`);
const jsonData = JSON.parse(jsonContent);

console.log('Analyzing structure...');
const results = analyzeStructure(jsonData);

console.log(`Found ${results.size} unique property paths`);
console.log('Generating markdown...');
const markdown = generateMarkdown(results, jsonData);

fs.writeFileSync(outputFile, markdown);
console.log(`Documentation written to: ${outputFile}`);

