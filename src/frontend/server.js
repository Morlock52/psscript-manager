import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// Enable CORS for all routes
app.use(cors());

// Determine which directory to serve static files from
let staticDir = 'dist';
if (!fs.existsSync(path.join(__dirname, 'dist')) && fs.existsSync(path.join(__dirname, 'public'))) {
  staticDir = 'public';
}

console.log(`Serving static files from: ${staticDir}`);

// Serve static files
app.use(express.static(path.join(__dirname, staticDir)));

// Handle all routes for the SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, staticDir, 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
