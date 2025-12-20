// Icon Generator Script
// Run: node create-icons.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if sharp is installed, if not install it
try {
    require.resolve('sharp');
} catch (e) {
    console.log('Installing sharp for image processing...');
    execSync('npm install sharp --save-dev', { stdio: 'inherit' });
}

try {
    require.resolve('to-ico');
} catch (e) {
    console.log('Installing to-ico...');
    execSync('npm install to-ico --save-dev', { stdio: 'inherit' });
}

const sharp = require('sharp');
const toIco = require('to-ico');

const svgPath = path.join(__dirname, 'assets', 'icon.svg');
const assetsDir = path.join(__dirname, 'assets');

async function generateIcons() {
    console.log('Generating icons from SVG...');

    const svgBuffer = fs.readFileSync(svgPath);

    // Generate PNG at different sizes
    const sizes = [512, 256, 128, 64, 48, 32, 16];

    for (const size of sizes) {
        const pngPath = path.join(assetsDir, `icon-${size}.png`);
        await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toFile(pngPath);
        console.log(`Created: icon-${size}.png`);
    }

    // Copy 256 as the main icon.png
    fs.copyFileSync(
        path.join(assetsDir, 'icon-256.png'),
        path.join(assetsDir, 'icon.png')
    );
    console.log('Created: icon.png (256x256)');

    // Generate ICO with multiple sizes
    console.log('Generating ICO file...');
    const pngBuffers = await Promise.all(
        [256, 128, 64, 48, 32, 16].map(size =>
            fs.promises.readFile(path.join(assetsDir, `icon-${size}.png`))
        )
    );

    const icoBuffer = await toIco(pngBuffers);
    fs.writeFileSync(path.join(assetsDir, 'icon.ico'), icoBuffer);
    console.log('Created: icon.ico');

    console.log('\n✓ All icons generated successfully!');
    console.log('Files created in assets/ folder:');
    console.log('  - icon.svg (source)');
    console.log('  - icon.png (256x256)');
    console.log('  - icon.ico (multi-size)');
    console.log('  - icon-16.png through icon-512.png');
}

generateIcons().catch(err => {
    console.error('Error generating icons:', err);
    process.exit(1);
});
