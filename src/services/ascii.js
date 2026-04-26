const sharp = require("sharp");
const https = require("https");
const http = require("http");
const { Buffer } = require("buffer");

// Mid-range character set with more gradations for better contrast
const CHARS = " .,;:-=+*#%@";

async function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    protocol.get(url, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function convertToAscii(imageBuffer, options = {}) {
  const { width = 100, invert = false, brightness = 0 } = options;

  try {
    // Get image metadata and convert to grayscale
    let pipeline = sharp(imageBuffer)
      .grayscale()
      .resize(width, Math.floor(width * 0.55), { fit: "fill" });

    // Apply brightness adjustment if provided
    if (brightness !== 0) {
      pipeline = pipeline.modulate({ brightness: 1 + brightness / 100 });
    }

    const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });

    const chars = invert ? CHARS.split("").reverse().join("") : CHARS;
    let ascii = "";

    for (let i = 0; i < data.length; i++) {
      const brightness = data[i];
      const charIndex = Math.floor((brightness / 255) * (CHARS.length - 1));
      ascii += chars[charIndex];

      if ((i + 1) % width === 0) {
        ascii += "\n";
      }
    }

    return ascii;
  } catch (error) {
    throw new Error(`Failed to convert image: ${error.message}`);
  }
}

async function processImage(input, options = {}) {
  const { width = 100, both = false, brightness = 0 } = options;

  let imageBuffer;
  if (input.startsWith("http")) {
    imageBuffer = await fetchImage(input);
  } else {
    imageBuffer = Buffer.from(input);
  }

  const normal = await convertToAscii(imageBuffer, { width, invert: false, brightness });
  if (both) {
    const inverted = await convertToAscii(imageBuffer, { width, invert: true, brightness });
    return { normal, inverted };
  }

  return { normal };
}

module.exports = { convertToAscii, processImage };
