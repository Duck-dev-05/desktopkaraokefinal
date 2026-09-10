#!/usr/bin/env node

/**
 * Production Build Script
 * Prepares and builds the application for production distribution across all platforms
 */

import { execSync } from 'child_process';
import { platform } from 'os';
import fs from 'fs';
import path from 'path';

const OS = platform();
console.log(`🏗️  Production Build Script (${OS})`);
console.log('=====================================\n');

// Check if external binaries exist
function checkExternalBinaries() {
  console.log('📦 Checking external binaries...');
  
  const binaries = {
    ffmpeg: false,
    'yt-dlp': false
  };
  
  // Check if binaries exist in common locations
  const commonPaths = [
    '/usr/local/bin',
    '/usr/bin',
    process.env.PATH || ''
  ];
  
  for (const binary of Object.keys(binaries)) {
    try {
      if (OS === 'win32') {
        execSync(`where ${binary}`, { stdio: 'pipe' });
      } else {
        execSync(`which ${binary}`, { stdio: 'pipe' });
      }
      binaries[binary] = true;
      console.log(`✅ ${binary} found`);
    } catch {
      console.log(`⚠️  ${binary} not found in PATH`);
    }
  }
  
  return binaries;
}

// Create external binaries directory structure
function setupBinariesDirectory() {
  const binDir = path.join(process.cwd(), 'src-tauri', 'bin');
  
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
    console.log('📁 Created binaries directory');
  }
  
  return binDir;
}

// Copy external binaries to bundle directory
function copyBinariesToBundle(binDir) {
  console.log('\n📋 Copying external binaries to bundle...');
  
  const binaries = {
    ffmpeg: OS === 'win32' ? 'ffmpeg.exe' : 'ffmpeg',
    'yt-dlp': OS === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  };
  
  for (const [source, target] of Object.entries(binaries)) {
    try {
      let sourcePath;
      
      if (OS === 'win32') {
        // Try to find the binary in Windows
        try {
          sourcePath = execSync(`where ${source}`, { encoding: 'utf8' }).trim().split('\n')[0];
        } catch {
          console.log(`⚠️  ${source} not found, skipping...`);
          continue;
        }
      } else {
        // Try to find the binary in Unix systems
        try {
          sourcePath = execSync(`which ${source}`, { encoding: 'utf8' }).trim();
        } catch {
          console.log(`⚠️  ${source} not found, skipping...`);
          continue;
        }
      }
      
      if (sourcePath && fs.existsSync(sourcePath)) {
        const targetPath = path.join(binDir, target);
        fs.copyFileSync(sourcePath, targetPath);
        
        // Make executable on Unix systems
        if (OS !== 'win32') {
          fs.chmodSync(targetPath, 0o755);
        }
        
        console.log(`✅ Copied ${source} to bundle`);
      }
    } catch (error) {
      console.log(`⚠️  Failed to copy ${source}: ${error.message}`);
    }
  }
}

// Clean previous builds
function cleanBuilds() {
  console.log('\n🧹 Cleaning previous builds...');
  
  const dirsToClean = [
    'dist',
    'src-tauri/target/release/bundle'
  ];
  
  for (const dir of dirsToClean) {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      try {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`✅ Cleaned ${dir}`);
      } catch (error) {
        console.log(`⚠️  Could not clean ${dir}: ${error.message}`);
      }
    }
  }
}

// Build frontend
function buildFrontend() {
  console.log('\n🔨 Building frontend...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Frontend built successfully');
  } catch (error) {
    console.error('❌ Frontend build failed:', error.message);
    process.exit(1);
  }
}

// Build Tauri app for current platform
function buildTauriApp() {
  console.log('\n🏗️  Building Tauri application...');
  
  try {
    // Build for current platform
    execSync('npm run tauri build', { stdio: 'inherit' });
    console.log('✅ Tauri application built successfully');
  } catch (error) {
    console.error('❌ Tauri build failed:', error.message);
    process.exit(1);
  }
}

// Build for specific platform
function buildForPlatform(targetPlatform) {
  console.log(`\n🏗️  Building for ${targetPlatform}...`);
  
  try {
    execSync(`npm run tauri build --target ${targetPlatform}`, { stdio: 'inherit' });
    console.log(`✅ Built for ${targetPlatform} successfully`);
  } catch (error) {
    console.error(`❌ Build for ${targetPlatform} failed:`, error.message);
  }
}

// Show build artifacts
function showBuildArtifacts() {
  console.log('\n📦 Build Artifacts:');
  console.log('====================');
  
  const bundleDir = path.join(process.cwd(), 'src-tauri', 'target', 'release', 'bundle');
  
  if (fs.existsSync(bundleDir)) {
    const listFiles = (dir, prefix = '') => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory()) {
          console.log(`${prefix}📁 ${item}/`);
          listFiles(itemPath, prefix + '  ');
        } else {
          const size = (stat.size / 1024 / 1024).toFixed(2);
          console.log(`${prefix}📄 ${item} (${size} MB)`);
        }
      }
    };
    
    listFiles(bundleDir);
  } else {
    console.log('No build artifacts found');
  }
}

// Main build process
async function main() {
  const args = process.argv.slice(2);
  const targetPlatform = args[0]; // e.g., 'windows', 'macos', 'linux'
  
  // Check external binaries
  const binaries = checkExternalBinaries();
  
  // Setup binaries directory
  const binDir = setupBinariesDirectory();
  
  // Copy binaries to bundle
  copyBinariesToBundle(binDir);
  
  // Clean previous builds
  cleanBuilds();
  
  // Build frontend
  buildFrontend();
  
  // Build Tauri app
  if (targetPlatform) {
    buildForPlatform(targetPlatform);
  } else {
    buildTauriApp();
  }
  
  // Show build artifacts
  showBuildArtifacts();
  
  console.log('\n🎉 Production build completed successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. Test the built application');
  console.log('2. Upload to distribution platform');
  console.log('3. Create GitHub release with artifacts');
  
  if (Object.values(binaries).some(v => !v)) {
    console.log('\n⚠️  Note: Some external binaries were not found.');
    console.log('The app will still work, but download features may be limited.');
    console.log('Users can install ffmpeg and yt-dlp separately.');
  }
}

// Run main function
main().catch(error => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});