#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const mode = process.argv[2]; // 'dev' or 'prod'
const pluginFile = path.join(__dirname, '..', 'fcom-modern-feed.php');

if (!mode || !['dev', 'prod'].includes(mode)) {
    console.error('Usage: node set-dev-mode.js <dev|prod>');
    process.exit(1);
}

const isDev = mode === 'dev';
const content = fs.readFileSync(pluginFile, 'utf8');

const newContent = content.replace(
    /define\('FCOM_MF_DEV',\s*(true|false)\);/,
    `define('FCOM_MF_DEV', ${isDev});`
);

fs.writeFileSync(pluginFile, newContent);
console.log(`Set FCOM_MF_DEV to ${isDev}`);
if (isDev) {
    console.log('WordPress will load the app from the Vite dev server (port 8120). Keep this process running and reload the page that contains the Modern Feed.');
}
