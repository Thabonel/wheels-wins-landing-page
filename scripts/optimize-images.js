import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images');
const IMAGES_TO_OPTIMIZE = [
  'WheelsnadwinsHero.jpg',
  'wheels and wins Logo alpha.png'
];

// Video files to generate posters for
const VIDEOS_TO_PROCESS = [
  {
    videoFile: 'Pam.mp4',
    posterName: 'Pam-poster.jpg',
    timeOffset: '0.5', // Extract frame at 0.5 seconds
    generateWebM: true, // Also generate WebM version for better compression
    webMQuality: '45' // VP9 quality (0-63, lower is better)
  }
];

async function checkFFmpegAvailable() {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch (error) {
    return false;
  }
}

async function generateWebMVersion(videoConfig) {
  const { videoFile, generateWebM, webMQuality } = videoConfig;

  if (!generateWebM) return true;

  const videoPath = path.join(IMAGES_DIR, videoFile);
  const ext = path.extname(videoFile);
  const nameWithoutExt = path.basename(videoFile, ext);
  const webmPath = path.join(IMAGES_DIR, `${nameWithoutExt}.webm`);

  // Check if WebM already exists and is newer than source
  if (fs.existsSync(webmPath)) {
    const videoStats = fs.statSync(videoPath);
    const webmStats = fs.statSync(webmPath);
    if (webmStats.mtime > videoStats.mtime) {
      console.log(`✅ WebM up to date: ${nameWithoutExt}.webm`);
      return true;
    }
  }

  console.log(`🎞️  Generating WebM version of ${videoFile}...`);

  try {
    // Convert to WebM with VP9 codec for better compression
    const webmCommand = `ffmpeg -y -i "${videoPath}" -c:v libvpx-vp9 -crf ${webMQuality} -b:v 0 -c:a libopus -b:a 128k "${webmPath}"`;
    await execAsync(webmCommand);

    // Get file sizes for comparison
    const originalSize = fs.statSync(videoPath).size;
    const webmSize = fs.statSync(webmPath).size;
    const savings = ((originalSize - webmSize) / originalSize * 100).toFixed(1);

    console.log(`✅ Generated WebM: ${nameWithoutExt}.webm (${savings}% smaller)`);
    return true;
  } catch (error) {
    console.error(`❌ Error generating WebM for ${videoFile}:`, error.message);
    return false;
  }
}

async function generateVideoPoster(videoConfig) {
  const { videoFile, posterName, timeOffset } = videoConfig;
  const videoPath = path.join(IMAGES_DIR, videoFile);
  const posterPath = path.join(IMAGES_DIR, posterName);

  // Check if video file exists
  if (!fs.existsSync(videoPath)) {
    console.log(`⚠️  Video not found: ${videoPath}`);
    return false;
  }

  // Check if poster already exists and is newer than video
  if (fs.existsSync(posterPath)) {
    const videoStats = fs.statSync(videoPath);
    const posterStats = fs.statSync(posterPath);
    if (posterStats.mtime > videoStats.mtime) {
      console.log(`✅ Poster up to date: ${posterName}`);
      return true;
    }
  }

  console.log(`🎬 Generating poster from ${videoFile} at ${timeOffset}s...`);

  try {
    // Extract frame using FFmpeg
    const ffmpegCommand = `ffmpeg -y -i "${videoPath}" -ss ${timeOffset} -vframes 1 -q:v 2 "${posterPath}"`;
    await execAsync(ffmpegCommand);
    console.log(`✅ Generated poster: ${posterName}`);

    // Now optimize the poster image using the existing optimization logic
    await optimizeImage(posterPath);

    return true;
  } catch (error) {
    console.error(`❌ Error generating poster for ${videoFile}:`, error.message);
    return false;
  }
}

async function generateCanvasFallbackPoster(videoConfig) {
  const { videoFile, posterName } = videoConfig;
  console.log(`🎨 Creating fallback poster for ${videoFile} (FFmpeg not available)`);

  try {
    // Create a simple gradient placeholder that matches the video dimensions
    // We'll make this 480x480 to match the video aspect ratio
    const fallbackPosterPath = path.join(IMAGES_DIR, posterName);

    await sharp({
      create: {
        width: 480,
        height: 480,
        channels: 3,
        background: { r: 139, g: 69, b: 19 } // Warm earth tone from design system
      }
    })
    .composite([{
      input: Buffer.from(`
        <svg width="480" height="480" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="grad" cx="50%" cy="30%" r="70%">
              <stop offset="0%" style="stop-color:#f4f1eb;stop-opacity:0.1"/>
              <stop offset="100%" style="stop-color:#8b4513;stop-opacity:0.8"/>
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grad)"/>
          <circle cx="240" cy="240" r="60" fill="#f4f1eb" fill-opacity="0.2"/>
          <text x="240" y="250" text-anchor="middle" fill="#f4f1eb" font-family="Arial" font-size="20" font-weight="bold">Pam</text>
        </svg>
      `),
      top: 0,
      left: 0
    }])
    .jpeg({ quality: 85 })
    .toFile(fallbackPosterPath);

    console.log(`✅ Created fallback poster: ${posterName}`);

    // Optimize the fallback poster
    await optimizeImage(fallbackPosterPath);

    return true;
  } catch (error) {
    console.error(`❌ Error creating fallback poster:`, error.message);
    return false;
  }
}

async function optimizeImage(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const nameWithoutExt = path.basename(imagePath, ext);
  const dir = path.dirname(imagePath);

  console.log(`📐 Optimizing ${path.basename(imagePath)}...`);

  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();

    // Create WebP version
    const webpPath = path.join(dir, `${nameWithoutExt}.webp`);
    await image
      .webp({ quality: 85 })
      .toFile(webpPath);
    console.log(`   ✅ Created WebP version`);

    // Create optimized version at different sizes
    const sizes = [
      { width: 1280, suffix: '-1280w' },
      { width: 800, suffix: '-800w' },
      { width: 400, suffix: '-400w' }
    ];

    for (const size of sizes) {
      if (metadata.width >= size.width) {
        const optimizedPath = path.join(dir, `${nameWithoutExt}${size.suffix}${ext}`);
        const webpSizePath = path.join(dir, `${nameWithoutExt}${size.suffix}.webp`);

        // Optimized original format
        await image
          .resize(size.width, size.width, { fit: 'cover' }) // Square aspect ratio for Pam poster
          .jpeg({ quality: 85, progressive: true })
          .toFile(optimizedPath);
        console.log(`   ✅ Created ${size.width}px version`);

        // WebP at this size
        await sharp(imagePath)
          .resize(size.width, size.width, { fit: 'cover' })
          .webp({ quality: 85 })
          .toFile(webpSizePath);
        console.log(`   ✅ Created ${size.width}px WebP`);
      }
    }

  } catch (error) {
    console.error(`❌ Error optimizing ${imagePath}:`, error);
  }
}

async function main() {
  console.log('🖼️  Starting image and video processing...\n');

  // Check if FFmpeg is available for video poster generation
  const ffmpegAvailable = await checkFFmpegAvailable();
  console.log(`FFmpeg available: ${ffmpegAvailable ? '✅' : '❌'}`);
  console.log('');

  // Generate video posters and WebM versions first
  console.log('🎬 Processing videos for poster generation and optimization...');
  for (const videoConfig of VIDEOS_TO_PROCESS) {
    if (ffmpegAvailable) {
      // Generate poster first
      await generateVideoPoster(videoConfig);
      // Generate WebM version for better compression
      await generateWebMVersion(videoConfig);
    } else {
      await generateCanvasFallbackPoster(videoConfig);
    }
    console.log('');
  }

  // Then optimize existing images
  console.log('🖼️  Optimizing existing images...');
  for (const imageName of IMAGES_TO_OPTIMIZE) {
    const imagePath = path.join(PUBLIC_DIR, imageName);
    if (fs.existsSync(imagePath)) {
      await optimizeImage(imagePath);
      console.log('');
    } else {
      console.log(`⚠️  Image not found: ${imagePath}`);
    }
  }

  console.log('✨ Image and video processing complete!');
  console.log('\nGenerated assets:');
  console.log('- Video posters with responsive sizes and WebP versions');
  console.log('- Optimized images with multiple formats');
  console.log('\nTo use optimized images with fallback in your HTML:');
  console.log(`
<picture>
  <source srcset="image-800w.webp" type="image/webp" media="(min-width: 800px)">
  <source srcset="image-400w.webp" type="image/webp">
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