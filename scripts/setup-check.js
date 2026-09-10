#!/usr/bin/env node

/**
 * Cross-Platform Setup Check Script
 * Checks if the development environment is properly configured
 */

import { execSync } from 'child_process';
import { platform } from 'os';

const OS = platform();
console.log(`🎤 Karaoke Pro - Environment Check (${OS})`);
console.log('==========================================\n');

const checks = [];

// Function to run a command and check if it exists
function commandExists(command) {
  try {
    if (OS === 'win32') {
      execSync(`where ${command}`, { stdio: 'pipe' });
    } else {
      execSync(`which ${command}`, { stdio: 'pipe' });
    }
    return true;
  } catch {
    return false;
  }
}

// Function to get command version
function getCommandVersion(command, versionFlag = '--version') {
  try {
    return execSync(`${command} ${versionFlag}`, { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

// Check Rust
const rustExists = commandExists('rustc');
if (rustExists) {
  const version = getCommandVersion('rustc');
  console.log('✅ Rust:', version);
  checks.push({ name: 'Rust', status: 'pass' });
} else {
  console.log('❌ Rust not found');
  console.log('   Install from: https://rustup.rs/');
  checks.push({ name: 'Rust', status: 'fail' });
}

// Check Node.js
const nodeExists = commandExists('node');
if (nodeExists) {
  const version = getCommandVersion('node');
  console.log('✅ Node.js:', version);
  checks.push({ name: 'Node.js', status: 'pass' });
} else {
  console.log('❌ Node.js not found');
  console.log('   Install from: https://nodejs.org/');
  checks.push({ name: 'Node.js', status: 'fail' });
}

// Check npm
const npmExists = commandExists('npm');
if (npmExists) {
  const version = getCommandVersion('npm');
  console.log('✅ npm:', version);
  checks.push({ name: 'npm', status: 'pass' });
} else {
  console.log('❌ npm not found');
  checks.push({ name: 'npm', status: 'fail' });
}

// Platform-specific checks
if (OS === 'darwin') {
  // macOS specific checks
  console.log('\n📱 macOS-specific checks:');
  
  const xcodeExists = commandExists('xcode-select');
  if (xcodeExists) {
    console.log('✅ Xcode Command Line Tools');
    checks.push({ name: 'Xcode Tools', status: 'pass' });
  } else {
    console.log('❌ Xcode Command Line Tools not found');
    console.log('   Install with: xcode-select --install');
    checks.push({ name: 'Xcode Tools', status: 'fail' });
  }
  
  const brewExists = commandExists('brew');
  if (brewExists) {
    console.log('✅ Homebrew');
    checks.push({ name: 'Homebrew', status: 'pass' });
  } else {
    console.log('⚠️  Homebrew not found (optional)');
    console.log('   Install from: https://brew.sh/');
    checks.push({ name: 'Homebrew', status: 'warn' });
  }
  
} else if (OS === 'linux') {
  // Linux specific checks
  console.log('\n🐧 Linux-specific checks:');
  
  const webkitExists = commandExists('webkit2gtk-4.1') || commandExists('WebKitGTK');
  if (webkitExists) {
    console.log('✅ WebKitGTK');
    checks.push({ name: 'WebKitGTK', status: 'pass' });
  } else {
    console.log('❌ WebKitGTK not found');
    console.log('   Install with: sudo apt install libwebkit2gtk-4.1-dev (Ubuntu/Debian)');
    console.log('   Or: sudo dnf install webkit2gtk4.1-devel (Fedora)');
    checks.push({ name: 'WebKitGTK', status: 'fail' });
  }
  
} else if (OS === 'win32') {
  // Windows specific checks
  console.log('\n🪟 Windows-specific checks:');
  
  const vsExists = commandExists('cl');
  if (vsExists) {
    console.log('✅ Visual Studio Build Tools');
    checks.push({ name: 'VS Build Tools', status: 'pass' });
  } else {
    console.log('⚠️  Visual Studio Build Tools may not be installed');
    console.log('   Install from: https://visualstudio.microsoft.com/visual-cpp-build-tools/');
    console.log('   Select "Desktop development with C++" workload');
    checks.push({ name: 'VS Build Tools', status: 'warn' });
  }
}

// Check external binaries
console.log('\n📦 External binaries:');

const ffmpegExists = commandExists('ffmpeg');
if (ffmpegExists) {
  const version = getCommandVersion('ffmpeg', '-version').split('\n')[0];
  console.log('✅ ffmpeg:', version);
  checks.push({ name: 'ffmpeg', status: 'pass' });
} else {
  console.log('⚠️  ffmpeg not found (optional but recommended)');
  console.log('   Install for video processing capabilities');
  if (OS === 'darwin') {
    console.log('   brew install ffmpeg');
  } else if (OS === 'linux') {
    console.log('   sudo apt install ffmpeg (Ubuntu/Debian)');
    console.log('   sudo dnf install ffmpeg (Fedora)');
  } else {
    console.log('   Download from: https://github.com/BtbN/FFmpeg-Builds/releases');
  }
  checks.push({ name: 'ffmpeg', status: 'warn' });
}

const ytdlpExists = commandExists('yt-dlp');
if (ytdlpExists) {
  const version = getCommandVersion('yt-dlp', '--version');
  console.log('✅ yt-dlp:', version);
  checks.push({ name: 'yt-dlp', status: 'pass' });
} else {
  console.log('⚠️  yt-dlp not found (optional but recommended)');
  console.log('   Install for YouTube download capabilities');
  if (OS === 'darwin') {
    console.log('   brew install yt-dlp');
  } else if (OS === 'linux') {
    console.log('   sudo apt install yt-dlp (Ubuntu/Debian)');
    console.log('   sudo dnf install yt-dlp (Fedora)');
    console.log('   Or: pip install yt-dlp');
  } else {
    console.log('   Download from: https://github.com/yt-dlp/yt-dlp/releases/latest');
  }
  checks.push({ name: 'yt-dlp', status: 'warn' });
}

// Check node_modules
const fs = await import('fs');
const path = await import('path');
const nodeModulesExists = fs.existsSync(path.join(process.cwd(), 'node_modules'));

if (nodeModulesExists) {
  console.log('\n✅ node_modules directory exists');
  checks.push({ name: 'node_modules', status: 'pass' });
} else {
  console.log('\n❌ node_modules directory not found');
  console.log('   Run: npm install');
  checks.push({ name: 'node_modules', status: 'fail' });
}

// Check .env file
const envExists = fs.existsSync(path.join(process.cwd(), '.env'));
if (envExists) {
  console.log('✅ .env file exists');
  checks.push({ name: '.env', status: 'pass' });
} else {
  console.log('⚠️  .env file not found');
  console.log('   Create .env file with your API keys');
  console.log('   Copy from .env.example if available');
  checks.push({ name: '.env', status: 'warn' });
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Summary:');
console.log('='.repeat(50));

const passed = checks.filter(c => c.status === 'pass').length;
const failed = checks.filter(c => c.status === 'fail').length;
const warned = checks.filter(c => c.status === 'warn').length;

console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`⚠️  Warnings: ${warned}`);

if (failed === 0) {
  console.log('\n🎉 Your environment is ready for development!');
  console.log('Run: npm run tauri dev');
} else {
  console.log('\n❌ Please fix the failed checks above before continuing.');
  process.exit(1);
}