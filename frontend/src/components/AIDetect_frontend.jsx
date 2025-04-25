import React, { useState, useEffect } from "react";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import DetectionMeter from "./DetectionMeter";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function AIDetect() {
  const [videoFile, setVideoFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [aiGenerated, setAiGenerated] = useState(null);
  const [confidenceScore, setConfidenceScore] = useState(null);
  const [analysisText, setAnalysisText] = useState("");

  // Add useEffect to control scroll position
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setVideoFile(file);
    setUploadMessage("");
    setResult(null);
    setAiGenerated(null);
    setConfidenceScore(null);
    setAnalysisText("");
  };

  const handleDetect = async () => {
    if (!videoFile) {
      setUploadMessage("Please select a video first.");
      return;
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("video", videoFile);

    try {
      const res = await fetch("http://localhost:5000/api/ai-detect", {
        // Updated URL
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Detection failed");

      const data = await res.json();

      if (data.error) {
        setResult(`Error: ${data.error}`);
      } else {
        // Update to match the backend response format
        const isAiGenerated = data.prediction === "Fake";
        setAiGenerated(isAiGenerated);
        setConfidenceScore(data.confidence);
        setAnalysisText(
          `The video was classified as ${
            data.prediction
          } with a confidence score of ${(data.confidence * 100).toFixed(2)}%.`
        );
        setResult(`AI‑Generated: ${isAiGenerated ? "Yes" : "No"}`);
      }
    } catch (err) {
      setResult(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (aiGenerated === null) return;

    try {
      const resp = await fetch("http://localhost:5000/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoResult: aiGenerated ? "Fake" : "Real",
          confidence_scores: `${aiGenerated ? "Fake" : "Real"} with ${(
            confidenceScore * 100
          ).toFixed(2)}% confidence`,
          anomalousFrames: null, // This is handled by the backend
        }),
      });

      if (!resp.ok) throw new Error("Report generation failed");
      const blob = await resp.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "AI_Generated_Video_Report.pdf";
      link.click();
    } catch (e) {
      console.error(e);
    }
  };

  const particlesInit = async (engine) => {
    await loadSlim(engine);
  };

  const particlesLoaded = (container) => {
    console.log("Particles loaded:", container);
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
              color: "#00040f",
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
              move: { enable: true, speed: 1 },
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
            Detect AI-Generated Videos
          </h1>
          <p className="text-base sm:text-lg text-white mb-4 sm:mb-6">
            Upload a video to begin analysis
          </p>

          {/* File Upload */}
          <label className="cursor-pointer w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto flex justify-center items-center bg-gradient-to-r from-[#00ffff] to-[#1e88e5] text-white py-3 rounded-full shadow-lg transition-transform transform hover:scale-105">
            <span className="font-semibold text-sm sm:text-base">Choose File</span>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {uploadMessage && (
            <p className="mt-2 text-red-400 font-semibold text-sm sm:text-base">{uploadMessage}</p>
          )}

          {/* Detect Button */}
          <button
            onClick={handleDetect}
            className="px-6 sm:px-8 py-2 sm:py-3 bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600 transition mt-4 shadow-lg transform hover:scale-105 text-sm sm:text-base"
          >
            {loading ? "Analyzing..." : "Detect"}
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

          {/* Results */}
          {result && (
            <div className="mt-4 sm:mt-6 w-full max-w-2xl mx-auto text-left bg-[#1e2a38] p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-bold mb-2 text-white">Detection Result</h2>
              <p className="text-white">
                <strong>Classification:</strong> {aiGenerated ? "Fake" : "Real"}
              </p>
              <p className="text-white">
                <strong>Confidence:</strong> {(confidenceScore * 100).toFixed(2)}%
              </p>
              <p className="mt-2 text-white">
                <strong>Analysis:</strong>
              </p>
              <p className="text-sm text-gray-300">{analysisText}</p>
            </div>
          )}

          {/* Download Report */}
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
}
