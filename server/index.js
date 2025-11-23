// server/index.js
const express = require("express");
const path = require("path");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 8000;

// Simple logger
app.use(morgan("dev"));

// Serve HLS files under / (so a stream at ./hls/stream1/stream1.m3u8 will be available at
// http://localhost:8000/stream1/stream1.m3u8)
const hlsRoot = path.join(__dirname, "..", "hls");

// Add CORS headers for HLS (m3u8 and .ts etc.)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // allow requests from your frontend
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Serve static files and ensure correct MIME types are set by express (usually automatic)
app.use(express.static(hlsRoot, {
  extensions: ['m3u8', 'ts', 'mp4', 'key']
}));

// Basic index to show available streams for convenience
app.get("/", (req, res) => {
  res.send(`<h3>HLS server running</h3><p>Serving files from: ${hlsRoot}</p>`);
});

app.listen(PORT, () => {
  console.log(`HLS static server running at http://localhost:${PORT}`);
  console.log(`Serving folder: ${hlsRoot}`);
});
