import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import multer from "multer";
import { uploadToWorker } from "./src/services/r2Service.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API routes
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/test", (req, res) => {
    res.json({ message: "API is working", method: req.method, url: req.url });
  });

  app.post("/api/upload", upload.single("file"), async (req, res) => {
    console.log("Upload request received. Body:", req.body);
    console.log("File info:", req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : "No file");

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { folder, userId } = req.body;
    if (!folder || !userId) {
      console.error("Missing metadata:", { folder, userId });
      return res.status(400).json({ error: "Missing folder or userId" });
    }

    const fileName = `${folder}/${userId}/${Date.now()}-${req.file.originalname}`;
    
    try {
      console.log("Starting upload to R2 worker:", fileName);
      const url = await uploadToWorker(req.file.buffer, fileName, req.file.mimetype);
      console.log("Upload successful. URL:", url);
      res.json({ url });
    } catch (error) {
      console.error("R2 Upload failed:", error);
      res.status(500).json({ 
        error: "Upload to storage failed", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // API 404 handler - catch all other /api/* requests
  app.all("/api/*", (req, res) => {
    console.warn(`404 on API route: ${req.method} ${req.url}`);
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global Server Error:", err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err.message || "An unexpected error occurred" 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    // Use vite.middlewares for assets and SPA fallback, but skip for API
    app.use((req, res, next) => {
      if (req.url.startsWith('/api/')) {
        return next();
      }
      vite.middlewares(req, res, next);
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.url.startsWith('/api/')) {
        return res.status(404).json({ error: "API route not found" });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
