const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Ensure the uploads folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer Configuration for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

app.post("/api/detect", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const videoPath = path.join(uploadDir, req.file.filename);
  const outputVideoPath = path.join(
    uploadDir,
    `processed_${req.file.filename}`
  );
  const isWindows = process.platform === "win32";

  const pythonCommand = isWindows
    ? `venv\\Scripts\\python deepfake_detection.py "${videoPath}"`
    : `source venv/bin/activate && python deepfake_detection.py "${videoPath}"`;

  // Run Deepfake Detection
  exec(pythonCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res
        .status(500)
        .json({ error: "Error running deepfake detection" });
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }

    try {
      const result = JSON.parse(stdout);

      // Extract the confidence score from the deepfake detection result
      const confidenceScore = result.confidence;

      // Run Face Mesh Detection with confidence score passed as an argument
      const faceMeshCommand = isWindows
        ? `venv\\Scripts\\python face_mesh_detection.py "${videoPath}" "${outputVideoPath}" ${confidenceScore}`
        : `source venv/bin/activate && python face_mesh_detection.py "${videoPath}" "${outputVideoPath}" ${confidenceScore}`;

      exec(faceMeshCommand, (meshError, meshStdout, meshStderr) => {
        if (meshError) {
          console.error(`Error: ${meshError.message}`);
          return res
            .status(500)
            .json({ error: "Error processing video with FaceMesh" });
        }
        if (meshStderr) {
          console.error(`stderr: ${meshStderr}`);
        }

        // Check if the processed video file exists before responding
        const checkFileExists = setInterval(() => {
          if (fs.existsSync(outputVideoPath)) {
            clearInterval(checkFileExists);
            console.log(`Processed video exists: ${outputVideoPath}`);
            res.json({
              ...result,
              processed_video_url: `http://localhost:5000/uploads/processed_${req.file.filename}`,
            });
          } else {
            console.log(`Waiting for processed video: ${outputVideoPath}`);
          }
        }, 1000); // Check every second
      });
    } catch (parseError) {
      console.error("Parsing error:", parseError);
      res.status(500).json({ error: "Error parsing inference result" });
    }
  });
});

// Serve processed videos
app.use("/uploads", express.static(uploadDir));

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
