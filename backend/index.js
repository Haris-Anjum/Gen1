require("dotenv").config(); // Load environment variables
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { OpenAI } = require("openai");
const PDFDocument = require("pdfkit"); // Using pdfkit for PDF creation

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
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Initialize OpenAI API (key comes from your .env)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to generate explanation using a vision-enabled model with inline Base64 image
async function generateExplanation(confidence_scores, type = "deepfake") {
  // Read the appropriate image based on type
  const framePath = path.join(
    __dirname,
    "temp_frames",
    type === "deepfake"
      ? "combined_anomalous_frames.jpg"
      : "combined_frames.jpg"
  );
  const buffer = fs.readFileSync(framePath);
  const b64 = buffer.toString("base64");
  const dataUrl = `data:image/jpeg;base64,${b64}`;

  // Different prompts based on type
  const deepfakePrompt = `The video has been flagged as ${confidence_scores}. Please analyze the following frame for any visual inconsistencies, anomalies, or characteristics that may indicate tampering or deepfake manipulation. Provide a detailed, technical report on the visual elements that may have led to this classification.

Describe the specific features of the frame that suggest it may be manipulated or genuine.

Analyze aspects such as lighting, shadows, facial features, motion inconsistencies, or other visual cues that could indicate an artificial creation.

Write the analysis in paragraph form, structured in a clear, easy-to-understand manner, explaining the visual cues that led to the final video result.

Focus on objective technical details that can help a user understand the rationale behind the deepfake classification, with a focus on clarity and professionalism.`;

  const aiGeneratedPrompt = `The video has been classified as ${confidence_scores}. Please analyze both the RGB frames and optical flow patterns shown in the images. The first two frames show the original video content, while the last two show the optical flow visualization.

Please provide a detailed analysis in paragraph form with section headings in plain text (no asterisks, no numbers, no Markdown). Each section heading should be on its own line and not formatted with stars or symbols.

Use the following section titles exactly as written:
Visual Consistency
Motion Analysis
Technical Indicators
Overall Assessment

Each section should:
- Begin with the plain section title on its own line
- Contain a clear and detailed paragraph explaining that aspect of the analysis
- Focus on objective visual and motion-based cues supporting the AI classification

Keep the language professional and easy to understand.`;

  const messages = [
    { role: "system", content: "You are an AI assistant with vision." },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: type === "deepfake" ? deepfakePrompt : aiGeneratedPrompt,
        },
        {
          type: "image_url",
          image_url: { url: dataUrl },
        },
      ],
    },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    max_tokens: 1000,
  });

  return response.choices[0].message.content;
}

async function generatePDF(
  explanation,
  anomalousFrames,
  videoResult,
  confidence_scores,
  type = "deepfake"
) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const filePath = path.join(uploadDir, "report.pdf");
    const pageWidth = doc.page.width;
    const margin = 50;
    const usableWidth = pageWidth - margin * 2;
    doc.pipe(fs.createWriteStream(filePath));

    // Logo
    const logoPath = path.join(__dirname, "assets", "logo.png");
    const logoW = 807 * 0.3,
      logoH = 199 * 0.3;
    doc.image(logoPath, (pageWidth - logoW) / 2, 20, {
      width: logoW,
      height: logoH,
    });

    // Title (centered)
    const title =
      type === "deepfake"
        ? "DEEPFAKE DETECTION REPORT"
        : "AI-GENERATED VIDEO DETECTION REPORT";

    doc.fontSize(18).text(title, margin, 20 + logoH + 15, {
      width: usableWidth,
      align: "center",
    });

    // Separator (small gap)
    doc.moveDown(0.3);
    doc
      .moveTo(margin, doc.y)
      .lineTo(pageWidth - margin, doc.y)
      .stroke();

    // Result & Confidence (centered & bold)
    doc.moveDown(1);
    const resultText = `${confidence_scores}`;

    doc
      .font("Helvetica-Bold") // switch to bold
      .fontSize(18)
      .text(resultText, margin, doc.y, {
        width: usableWidth, // span the available width
        align: "center", // center align
        lineGap: 2,
        paragraphGap: 3,
      });

    // (optional) switch back to your regular font afterwards
    doc.font("Helvetica").fontSize(12);

    // Anomalous Frames heading (centered, small gap)
    doc.moveDown(0.5);
    doc.fontSize(14).text("Anomalous Frames", margin, doc.y, {
      width: usableWidth,
      align: "center",
    });

    // Image (fits within margins)
    const imgPath = path.join(
      __dirname,
      "temp_frames",
      type === "deepfake"
        ? "combined_anomalous_frames.jpg"
        : "combined_frames.jpg"
    );
    const maxImgW = usableWidth;
    doc.image(imgPath, margin, doc.y + 5, { width: maxImgW });

    // Explanation (justified, tighter spacing)
    doc.moveDown(10);
    if (explanation) {
      doc.fontSize(12).text(explanation, margin, doc.y, {
        width: usableWidth,
        align: "justify",
        lineGap: 2,
        paragraphGap: 1,
      });
    }

    // Finalize
    doc.end();
    doc.on("end", () => resolve(filePath));
    doc.on("error", reject);
  });
}

// Route to handle deepfake detection and face mesh analysis
app.post("/api/detect", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  // Check file size (10MB = 10 * 1024 * 1024 bytes)
  if (req.file.size > 10 * 1024 * 1024) {
    // Delete the uploaded file
    fs.unlinkSync(path.join(uploadDir, req.file.filename));
    return res.status(400).json({
      error: "File size exceeds 10MB limit. Please upload a smaller video.",
    });
  }

  const videoPath = path.join(uploadDir, req.file.filename);
  const outputVideoPath = path.join(
    uploadDir,
    `processed_${req.file.filename}`
  );
  const isWindows = process.platform === "win32";

  const pythonCmd = isWindows
    ? `venv\\Scripts\\python deepfake_detection.py "${videoPath}"`
    : `source venv/bin/activate && python deepfake_detection.py "${videoPath}"`;

  exec(pythonCmd, (error, stdout, stderr) => {
    console.log("Python stdout:", stdout);
    console.error("Python stderr:", stderr);

    // First try to parse stdout as JSON
    try {
      // Find the last JSON object in stdout
      const jsonMatch = stdout.match(/\{.*\}/s);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in output");
      }

      const result = JSON.parse(jsonMatch[0]);

      // Check for any error from the Python script
      if (result.error) {
        console.error("Python script error:", result.error);
        return res.status(400).json({ error: result.error });
      }

      // If we got here, it's a valid result - proceed with face mesh detection
      const faceMeshCmd = isWindows
        ? `venv\\Scripts\\python face_mesh_detection.py "${videoPath}" "${outputVideoPath}" '${JSON.stringify(
            result.confidence_scores
          )}'`
        : `source venv/bin/activate && python face_mesh_detection.py "${videoPath}" "${outputVideoPath}" '${JSON.stringify(
            result.confidence_scores
          )}'`;

      exec(faceMeshCmd, (meshErr, meshStdout, meshStderr) => {
        if (meshErr) {
          console.error(`FaceMesh error: ${meshErr.message}`);
          return res
            .status(500)
            .json({ error: "Error processing video with FaceMesh" });
        }
        if (meshStderr) console.error(meshStderr);

        const waitForOutput = setInterval(() => {
          if (fs.existsSync(outputVideoPath)) {
            clearInterval(waitForOutput);
            res.json({
              ...result,
              processed_video_url: `http://localhost:${port}/uploads/processed_${req.file.filename}`,
            });
          }
        }, 1000);
      });
    } catch (parseErr) {
      // If stdout isn't JSON, check if it's an error
      if (error) {
        console.error(`Deepfake error: ${error.message}`);
        return res.status(400).json({
          error:
            error.message ||
            "Error processing video: Please upload a valid video file",
        });
      }
      // If we got here, something unexpected happened
      console.error("Unexpected error:", parseErr);
      return res.status(500).json({
        error: stderr || "Error processing video. Please try again.",
      });
    }
  });
});

app.post("/api/ai-detect", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  // Check if the uploaded file is an image
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff'];
  const fileExt = path.extname(req.file.originalname).toLowerCase();
  
  if (imageExtensions.includes(fileExt)) {
    return res.status(400).json({ 
      error: "Please upload a video file. Image files are not supported." 
    });
  }

  const videoPath = path.join(uploadDir, req.file.filename);
  const filenameWithoutExt = path.parse(req.file.filename).name;
  const isWindows = process.platform === "win32";

  // Modified command to ensure proper environment activation
  const pythonCmd = isWindows
    ? `venv2\\Scripts\\python demo.py --use_cpu --path "${videoPath}" --folder_original_path "frame\\${filenameWithoutExt}" --folder_optical_flow_path "optical_result\\${filenameWithoutExt}" -mop "checkpoints\\optical.pth" -mor "checkpoints\\original.pth"`
    : `source venv2/bin/activate && python demo.py --use_cpu --path "${videoPath}" --folder_original_path "frame/${filenameWithoutExt}" --folder_optical_flow_path "optical_result/${filenameWithoutExt}" -mop "checkpoints/optical.pth" -mor "checkpoints/original.pth"`;

  exec(pythonCmd, { cwd: __dirname }, (error, stdout, stderr) => {
    console.log("Python output:", stdout);
    console.error("Python errors:", stderr);
    if (error) {
      console.error("Execution error:", error);
      return res.status(500).json({
        error: `Error running AI detection: ${stderr || error.message}`,
      });
    }

    let result;
    try {
      result = JSON.parse(stdout);
    } catch (parseErr) {
      console.error("Parse error:", parseErr);
      return res.status(500).json({ error: "Error parsing detection result" });
    }

    res.json({
      ...result,
      uploaded_video_url: `http://localhost:${port}/uploads/${req.file.filename}`,
    });
  });
});

// Route to generate PDF report
app.post("/api/generate-report", async (req, res) => {
  const {
    videoResult,
    anomalousFrames,
    confidence_scores,
    type = "deepfake",
  } = req.body;

  try {
    const explanation = await generateExplanation(confidence_scores, type);
    const filePath = await generatePDF(
      explanation,
      anomalousFrames,
      videoResult,
      confidence_scores,
      type
    );

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        return res.status(500).json({ error: "Report not found" });
      }
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${
          type === "deepfake" ? "Deepfake" : "AI_Generated"
        }_Detection_Report.pdf"`
      );
      res.sendFile(filePath);
    });
  } catch (err) {
    console.error("Report generation error:", err);
    res.status(500).json({ error: "Error generating report" });
  }
});

// Serve processed videos
app.use("/uploads", express.static(uploadDir));

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
