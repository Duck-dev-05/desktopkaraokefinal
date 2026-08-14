import { execSync } from 'child_process';
import fs from 'fs';

try {
  // Get latest git tag (prioritize GitHub Actions env var if it exists)
  const tag = process.env.GITHUB_REF_NAME || execSync('git describe --tags --abbrev=0').toString().trim();
  let version = tag.replace(/^v/, ''); // Remove the 'v' prefix

  // Ensure strict semantic versioning (Major.Minor.Patch) for Rust/Cargo compatibility
  const parts = version.split('.');
  if (parts.length === 1) version = `${version}.0.0`;
  else if (parts.length === 2) version = `${version}.0`;

  console.log(`Syncing local configuration files to version: ${version}`);

  // 1. Update package.json
  const pkgPath = 'package.json';
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.version = version;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }

  // 2. Update tauri.conf.json
  const tauriPath = 'src-tauri/tauri.conf.json';
  if (fs.existsSync(tauriPath)) {
    const tauri = JSON.parse(fs.readFileSync(tauriPath, 'utf8'));
    tauri.version = version;
    fs.writeFileSync(tauriPath, JSON.stringify(tauri, null, 2) + '\n');
  }

  // 3. Update Cargo.toml
  const cargoPath = 'src-tauri/Cargo.toml';
  if (fs.existsSync(cargoPath)) {
    let cargo = fs.readFileSync(cargoPath, 'utf8');
    cargo = cargo.replace(/^version = ".*"/m, `version = "${version}"`);
    fs.writeFileSync(cargoPath, cargo);
  }

} catch (error) {
  console.log('No Git tags found or an error occurred. Skipping version sync.');
}
