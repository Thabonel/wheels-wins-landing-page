import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const IMAGES_TO_OPTIMIZE = [
  'WheelsnadwinsHero.jpg',
  'wheels and wins Logo alpha.png'
];

async function optimizeImage(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const nameWithoutExt = path.basename(imagePath, ext);
  const dir = path.dirname(imagePath);
  
  console.log(`Optimizing ${imagePath}...`);
  
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    
    // Create WebP version
    const webpPath = path.join(dir, `${nameWithoutExt}.webp`);
    await image
      .webp({ quality: 85 })
      .toFile(webpPath);
    console.log(`✅ Created WebP: ${webpPath}`);
    
    // Create optimized version at different sizes
    const sizes = [
      { width: 1920, suffix: '-1920w' },
      { width: 1200, suffix: '-1200w' },
      { width: 800, suffix: '-800w' },
      { width: 400, suffix: '-400w' }
    ];
    
    for (const size of sizes) {
      if (metadata.width >= size.width) {
        const optimizedPath = path.join(dir, `${nameWithoutExt}${size.suffix}${ext}`);
        const webpSizePath = path.join(dir, `${nameWithoutExt}${size.suffix}.webp`);
        
        // Optimized original format
        await image
          .resize(size.width)
          .jpeg({ quality: 85, progressive: true })
          .toFile(optimizedPath);
        console.log(`✅ Created ${size.width}px version: ${optimizedPath}`);
        
        // WebP at this size
        await sharp(imagePath)
          .resize(size.width)
          .webp({ quality: 85 })
          .toFile(webpSizePath);
        console.log(`✅ Created ${size.width}px WebP: ${webpSizePath}`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Error optimizing ${imagePath}:`, error);
  }
}

async function main() {
  console.log('🖼️  Starting image optimization...\n');
  
  for (const imageName of IMAGES_TO_OPTIMIZE) {
    const imagePath = path.join(PUBLIC_DIR, imageName);
    if (fs.existsSync(imagePath)) {
      await optimizeImage(imagePath);
      console.log('');
    } else {
      console.log(`⚠️  Image not found: ${imagePath}`);
    }
  }
  
  console.log('✨ Image optimization complete!');
  console.log('\nTo use WebP with fallback in your HTML:');
  console.log(`
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Description" loading="lazy">
</picture>
  `);
}

// Check if sharp is installed
try {
  await import('sharp');
  main();
} catch (error) {
  console.log('📦 Installing sharp for image optimization...');
  console.log('Run: npm install --save-dev sharp');
  console.log('Then run this script again.');
}