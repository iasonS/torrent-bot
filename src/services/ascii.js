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
  const { width = 100, invert = false, brightness = 0, mode = "brightness" } = options;

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
    const height = Math.floor(width * 0.55);
    let processedData = data;

    // Apply edge detection if mode is "edges"
    if (mode === "edges") {
      processedData = detectEdges(data, width, height);
    }

    const chars = invert ? CHARS.split("").reverse().join("") : CHARS;
    let ascii = "";

    for (let i = 0; i < processedData.length; i++) {
      const value = processedData[i];
      const charIndex = Math.floor((value / 255) * (CHARS.length - 1));
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

function detectEdges(data, width, height) {
  const edges = new Uint8ClampedArray(data.length);

  // Sobel edge detection
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const idx = i * width + j;

      // Skip edges
      if (i === 0 || i === height - 1 || j === 0 || j === width - 1) {
        edges[idx] = 0;
        continue;
      }

      // Sobel kernels
      const gx =
        -data[(i - 1) * width + (j - 1)] +
        data[(i - 1) * width + (j + 1)] +
        -2 * data[i * width + (j - 1)] +
        2 * data[i * width + (j + 1)] +
        -data[(i + 1) * width + (j - 1)] +
        data[(i + 1) * width + (j + 1)];

      const gy =
        -data[(i - 1) * width + (j - 1)] +
        -2 * data[(i - 1) * width + j] +
        -data[(i - 1) * width + (j + 1)] +
        data[(i + 1) * width + (j - 1)] +
        2 * data[(i + 1) * width + j] +
        data[(i + 1) * width + (j + 1)];

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[idx] = Math.min(255, magnitude / 4);
    }
  }

  return edges;
}

async function processImage(input, options = {}) {
  const { width = 100, both = false, brightness = 0, mode = "brightness" } = options;

  let imageBuffer;
  if (input.startsWith("http")) {
    imageBuffer = await fetchImage(input);
  } else {
    imageBuffer = Buffer.from(input);
  }

  const normal = await convertToAscii(imageBuffer, { width, invert: false, brightness, mode });
  if (both) {
    const inverted = await convertToAscii(imageBuffer, { width, invert: true, brightness, mode });
    return { normal, inverted };
  }

  return { normal };
}

module.exports = { convertToAscii, processImage };
