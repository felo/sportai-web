#!/usr/bin/env node
/**
 * Generate PWA icons from a source image
 * 
 * Usage:
 *   node scripts/generate-icons.js <source-image>
 * 
 * Example:
 *   node scripts/generate-icons.js ~/Downloads/sportai-logo.png
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SIZES = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
];

const OUTPUT_DIR = path.join(__dirname, '..', 'public');

async function generateIcons(sourcePath) {
  if (!sourcePath) {
    console.error('❌ Please provide a source image path');
    console.error('   Usage: node scripts/generate-icons.js <source-image>');
    console.error('   Example: node scripts/generate-icons.js ~/Downloads/sportai-logo.png');
    process.exit(1);
  }

  // Resolve path (handle ~)
  const resolvedPath = sourcePath.replace(/^~/, process.env.HOME);
  
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Source image not found: ${resolvedPath}`);
    process.exit(1);
  }

  console.log(`🖼️  Source: ${resolvedPath}`);
  console.log(`📁 Output: ${OUTPUT_DIR}\n`);

  for (const { size, name } of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, name);
    
    try {
      await sharp(resolvedPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${name}: ${error.message}`);
    }
  }

  // Generate favicon.ico (using 32x32 as base)
  try {
    const favicon32 = path.join(OUTPUT_DIR, 'favicon-32x32.png');
    const faviconIco = path.join(OUTPUT_DIR, 'favicon.ico');
    
    // Copy 32x32 as favicon.ico (browsers accept PNG with .ico extension)
    fs.copyFileSync(favicon32, faviconIco);
    console.log(`✅ Generated favicon.ico`);
  } catch (error) {
    console.error(`❌ Failed to generate favicon.ico: ${error.message}`);
  }

  console.log('\n🎉 Done! Now update your manifest.json and layout.tsx');
}

generateIcons(process.argv[2]);

