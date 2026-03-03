#!/usr/bin/env node

/**
 * Manual deployment script for GitHub Pages
 * Run this script to build and deploy your app to GitHub Pages
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting GitHub Pages deployment...');

try {
  // Step 1: Build the app for GitHub Pages
  console.log('📦 Building app for GitHub Pages...');
  execSync('cross-env VITE_BASE_URL=/xenodoxioo/ pnpm run build:client', { stdio: 'inherit' });
  
  // Step 2: Create .nojekyll file (optional but recommended)
  console.log('📄 Creating .nojekyll file...');
  fs.writeFileSync('dist/spa/.nojekyll', '');
  
  // Step 3: Copy 404.html to dist/spa if it doesn't exist
  const source404 = 'public/404.html';
  const dest404 = 'dist/spa/404.html';
  if (fs.existsSync(source404) && !fs.existsSync(dest404)) {
    console.log('📄 Copying 404.html...');
    fs.copyFileSync(source404, dest404);
  }
  
  // Step 4: Initialize git in dist folder if not already done
  const distDir = 'dist/spa';
  if (!fs.existsSync(path.join(distDir, '.git'))) {
    console.log('🔧 Initializing git in dist folder...');
    execSync('git init', { cwd: distDir, stdio: 'inherit' });
    execSync('git branch -M main', { cwd: distDir, stdio: 'inherit' });
  }
  
  // Step 5: Add and commit changes
  console.log('📝 Committing changes...');
  execSync('git add .', { cwd: distDir, stdio: 'inherit' });
  execSync('git commit -m "Deploy to GitHub Pages"', { cwd: distDir, stdio: 'inherit' });
  
  // Step 6: Push to gh-pages branch
  console.log('🚀 Pushing to GitHub Pages...');
  execSync('git push -f https://github.com/sio2000/xenodoxioo.git main:gh-pages', { cwd: distDir, stdio: 'inherit' });
  
  console.log('✅ Deployment successful!');
  console.log('🌐 Your app should be available at: https://sio2000.github.io/xenodoxioo/');
  console.log('⏳ It may take a few minutes for GitHub Pages to update.');
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}
