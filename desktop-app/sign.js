const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

exports.default = async function(configuration) {
    // Skip signing if no certificate is available
    if (!process.env.CSC_LINK && !process.env.WIN_CSC_LINK) {
        console.log('No certificate found, skipping signing');
        return;
    }

    const signToolPath = 'signtool';
    const certificatePath = process.env.CSC_LINK || process.env.WIN_CSC_LINK;
    const certificatePassword = process.env.CSC_KEY_PASSWORD || process.env.WIN_CSC_KEY_PASSWORD || '';

    const filePath = configuration.path;

    console.log(`Signing: ${filePath}`);

    try {
        // Use signtool to sign the executable
        const args = [
            'sign',
            '/f', certificatePath,
            '/p', certificatePassword,
            '/fd', 'sha256',
            '/tr', 'http://timestamp.digicert.com',
            '/td', 'sha256',
            '/d', '"Folder Architect"',
            filePath
        ];

        execSync(`${signToolPath} ${args.join(' ')}`, { stdio: 'inherit' });
        console.log(`Successfully signed: ${filePath}`);
    } catch (error) {
        console.error(`Failed to sign ${filePath}:`, error.message);
        // Don't fail the build if signing fails - just continue unsigned
    }
};
