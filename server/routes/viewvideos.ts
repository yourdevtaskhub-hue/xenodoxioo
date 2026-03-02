import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";

const router = Router();
const VIEW_VIDEOS_DIR = path.join(process.cwd(), "public", "viewvideos");

// Whitelist of allowed video filenames (security: prevent path traversal)
const ALLOWED_VIDEOS = [
  "Ogra House.mp4",
  "Small bungalow.mp4",
  "Μεγάλο bungalow.mp4",
  "Lykoskufi 5.mp4",
  "Lykoskufi2.mp4",
];

router.get("/:filename", (req: Request, res: Response) => {
  const filename = decodeURIComponent(req.params.filename);
  if (!ALLOWED_VIDEOS.includes(filename)) {
    return res.status(404).json({ error: "Video not found" });
  }
  const filePath = path.join(VIEW_VIDEOS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Video file not found" });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4",
    });
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

export default router;
