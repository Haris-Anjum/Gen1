import React, { useState, useEffect } from "react";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim"; // Use the slim version
import DetectionMeter from "../components/DetectionMeter"; // Import DetectionMeter
import Navbar from "./Navbar";
import Footer from "./Footer";

const ParticleTest = () => {
  const [videoFile, setVideoFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [processedVideo, setProcessedVideo] = useState(null);
  const [videoResult, setVideoResult] = useState(null); // Store the detection result
  const [anomalousFrames, setAnomalousFrames] = useState([]); // Store anomalous frames if necessary
  const [confidenceScores, setConfidenceScores] = useState(null);

  // Add useEffect to control scroll position
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setVideoFile(file);
    // Reset states when new file is uploaded
    setResult(null);
    setProcessedVideo(null);
    setVideoResult(null);
    setAnomalousFrames([]);
    setConfidenceScores(null);
    if (file) {
      setUploadMessage("");
    } else {
      setUploadMessage("");
    }
  };

  const handleScan = async () => {
    if (!videoFile) return;
    setLoading(true);
    setProcessedVideo(null);

    const formData = new FormData();
    formData.append("video", videoFile);

    try {
      const response = await fetch("http://localhost:5000/api/detect", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch detection results.");
      }

      const data = await response.json();
      setLoading(false);

      if (data.error) {
        setResult(`Error: ${data.error}`);
      } else {
        setResult(
          `Prediction: ${data.prediction}, Confidence: ${(
            data.confidence * 100
          ).toFixed(2)}%`
        );
        setProcessedVideo(data.processed_video_url);
        setVideoResult(data.prediction); // Store the detection result
        setAnomalousFrames(data.anomalous_frames || []); // If you have anomalous frames, update here
      }
    } catch (error) {
      setLoading(false);
      setResult(`Error: ${error.message}`);
    }
  };

  const particlesInit = async (engine) => {
    console.log("Loading slim version for particles");
    await loadSlim(engine);
  };

  const particlesLoaded = (container) => {
    console.log("Particles container loaded:", container);
  };

  // Function to handle downloading the report
  const handleDownloadReport = async () => {
    if (!videoResult) return;

    try {
      const response = await fetch(
        "http://localhost:5000/api/generate-report",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // videoResult: videoResult, // Pass the result of the deepfake detection
            anomalousFrames: anomalousFrames, // Pass the anomalous frames (if any)
            confidence_scores: result,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate report.");
      }

      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "Deepfake_Detection_Report.pdf"; // Set default download filename
      link.click();
    } catch (error) {
      console.error("Error generating report:", error);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col bg-[#00040f]">
      <Navbar />

      {/* Main Content with Particles */}
      <div className="flex-grow relative">
        {/* Particles Background */}
        <Particles
          id="tsparticles"
          init={particlesInit}
          loaded={particlesLoaded}
          options={{
            fullScreen: false,
            background: {
              color: "#00040f", // Updated to match navbar/footer background
            },
            particles: {
              number: { value: 150 },
              color: { value: "#00ffff" },
              shape: { type: "circle" },
              opacity: { value: 0.5 },
              size: { value: 3 },
              links: {
                enable: true,
                distance: 150,
                color: "#00ffff",
                opacity: 0.4,
                width: 1,
              },
              move: { enable: true, speed: 3 },
            },
            interactivity: {
              events: { onHover: { enable: true, mode: "repulse" } },
            },
          }}
          className="absolute inset-0"
        />

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col items-center justify-start min-h-[calc(100vh-180px)] w-full px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 sm:mb-6">
            Scan and Detect DeepFake Videos
          </h1>
          <p className="text-base sm:text-lg text-white mb-4 sm:mb-6">
            Upload your video here
          </p>

          {/* File Upload */}
          <label className="cursor-pointer w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto flex justify-center items-center bg-gradient-to-r from-[#00ffff] to-[#1e88e5] text-white py-3 rounded-full shadow-lg transition-transform transform hover:scale-105">
            <span className="font-semibold text-sm sm:text-base">
              Choose File
            </span>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {uploadMessage && (
            <p className="mt-2 text-green-400 font-semibold text-sm sm:text-base">
              {uploadMessage}
            </p>
          )}

          {/* Scan Button */}
          <button
            onClick={handleScan}
            className="px-6 sm:px-8 py-2 sm:py-3 bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600 transition mt-4 shadow-lg transform hover:scale-105 text-sm sm:text-base"
          >
            {loading ? "Scanning..." : "Scan"}
          </button>

          {/* Detection Meter */}
          {videoFile && (
            <div className="mt-4 sm:mt-6 w-full max-w-xl mx-auto">
              <DetectionMeter
                loading={loading}
                result={result}
                videoName={videoFile.name}
                videoSize={(videoFile.size / (1024 * 1024)).toFixed(2)}
              />
            </div>
          )}

          {/* Processed Video */}
          {processedVideo && (
            <div className="mt-4 sm:mt-6 w-full max-w-4xl mx-auto px-4 flex flex-col items-center">
              <h2 className="text-white text-base sm:text-lg font-semibold mb-4 text-center">
                Processed Video
              </h2>
              <div className="w-full flex justify-center">
                <video
                  controls
                  className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
                  playsInline
                >
                  <source src={processedVideo} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          )}

          {/* Download Report Button */}
          {result && (
            <div className="mt-4 sm:mt-6">
              <button
                onClick={handleDownloadReport}
                className="px-6 sm:px-8 py-2 sm:py-3 bg-green-500 text-white font-semibold rounded-full hover:bg-green-600 transition text-sm sm:text-base"
              >
                Download Report
              </button>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ParticleTest;
