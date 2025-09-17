// Ensure matching pdf.worker is copied to public for runtime
const fs = require('fs');
const path = require('path');

function copyWorker() {
  const projectRoot = process.cwd();
  const publicDir = path.join(projectRoot, 'public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

  const tryPaths = [
    path.join(projectRoot, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js'),
    path.join(projectRoot, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs'),
    path.join(projectRoot, 'node_modules', 'react-pdf', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs'),
  ];

  const dest = path.join(publicDir, 'pdf.worker.min.js');
  for (const src of tryPaths) {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log('Copied PDF worker from:', src);
      return;
    }
  }

  console.warn('Warning: pdf.worker.min.mjs not found. PDF viewing may fail.');
}

copyWorker();


