const Jimp = require('jimp');
const fs = require('fs');

async function removeBackground(imagePath, outputPath) {
    console.log(`Processing ${imagePath}...`);
    try {
        const image = await Jimp.read(imagePath);
        const distance = (r1, g1, b1, r2, g2, b2) => {
            return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
        };

        // Determine background color from top-left pixel
        const bgColor = Jimp.intToRGBA(image.getPixelColor(0, 0));

        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];
            
            // If the pixel is very close to white/bgColor, make it transparent
            if (distance(r, g, b, 255, 255, 255) < 30 || distance(r, g, b, bgColor.r, bgColor.g, bgColor.b) < 30) {
                this.bitmap.data[idx + 3] = 0; // Alpha channel
            }
        });

        await image.writeAsync(outputPath);
        console.log(`Saved transparent image to ${outputPath}`);
    } catch (err) {
        console.error(`Error processing ${imagePath}:`, err);
    }
}

async function main() {
    const basePath = 'C:\\Users\\stanl\\baseline\\chyta\\assets\\images';
    await removeBackground(`${basePath}\\logo.png`, `${basePath}\\logo.png`);
    await removeBackground(`${basePath}\\chyta-text.png`, `${basePath}\\chyta-text.png`);
    
    // Also update OneDrive folder to keep them in sync
    const odBasePath = 'c:\\Users\\stanl\\OneDrive\\Documents\\baseline\\chyta\\assets\\images';
    fs.copyFileSync(`${basePath}\\logo.png`, `${odBasePath}\\logo.png`);
    fs.copyFileSync(`${basePath}\\chyta-text.png`, `${odBasePath}\\chyta-text.png`);
    console.log('Done syncing to OneDrive folder.');
}

main();
