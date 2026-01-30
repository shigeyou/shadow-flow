const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Modern app icon SVG - Sound wave flow design
const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
    <linearGradient id="wave" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.9"/>
      <stop offset="100%" style="stop-color:#e0e7ff;stop-opacity:0.9"/>
    </linearGradient>
  </defs>

  <!-- Background with rounded corners -->
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>

  <!-- Sound wave bars - representing audio flow -->
  <g fill="url(#wave)">
    <!-- Left wave bars -->
    <rect x="80" y="200" width="28" height="112" rx="14"/>
    <rect x="128" y="160" width="28" height="192" rx="14"/>
    <rect x="176" y="120" width="28" height="272" rx="14"/>

    <!-- Center bars (tallest) -->
    <rect x="224" y="96" width="32" height="320" rx="16"/>
    <rect x="276" y="96" width="32" height="320" rx="16"/>

    <!-- Right wave bars -->
    <rect x="328" y="120" width="28" height="272" rx="14"/>
    <rect x="376" y="160" width="28" height="192" rx="14"/>
    <rect x="424" y="200" width="28" height="112" rx="14"/>
  </g>

  <!-- Subtle shine effect -->
  <ellipse cx="180" cy="140" rx="120" ry="80" fill="white" opacity="0.1"/>
</svg>
`;

async function generateIcons() {
  const publicDir = path.join(__dirname, '..', 'public');

  // Generate 512x512 icon
  await sharp(Buffer.from(iconSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));

  console.log('Generated icon-512.png');

  // Generate 192x192 icon
  await sharp(Buffer.from(iconSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));

  console.log('Generated icon-192.png');

  // Generate apple touch icon
  await sharp(Buffer.from(iconSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  console.log('Generated apple-touch-icon.png');

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
