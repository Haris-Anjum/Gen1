import React, { useState } from "react";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim"; // Use the slim version
import DetectionMeter from "./DetectionMeter"; // Import DetectionMeter

const ParticleTest = () => {
  const [videoFile, setVideoFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [processedVideo, setProcessedVideo] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setVideoFile(file);
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

  return (
    <div className="relative w-full min-h-screen">
      {/* Particles Background */}
      <Particles
        id="tsparticles"
        init={particlesInit}
        loaded={particlesLoaded}
        options={{
          fullScreen: { enable: true, zIndex: -1 },
          background: {
            image: "linear-gradient(to bottom right, #1e1b2b, #1f2c4b)", // Gradient from the image
          },
          particles: {
            number: { value: 150 }, // Increased number of particles to 150
            color: { value: "#00ffff" }, // Cyan particles
            shape: { type: "circle" },
            opacity: { value: 0.5 },
            size: { value: 3 },
            links: {
              enable: true,
              distance: 150,
              color: "#00ffff", // Cyan links
              opacity: 0.4,
              width: 1,
            },
            move: { enable: true, speed: 1 },
          },
          interactivity: {
            events: { onHover: { enable: true, mode: "repulse" } },
          },
        }}
      />

      {/* Centered Content */}
      <div className="absolute z-10 flex flex-col items-center justify-center w-full h-full text-center p-8">
        <h1 className="text-4xl font-bold text-white mb-6">
          Scan and Detect DeepFake Videos
        </h1>
        <p className="text-lg text-white mb-6">Upload your video here</p>

        {/* File Upload */}
        <label className="cursor-pointer w-96 mx-auto flex justify-center items-center bg-gradient-to-r from-[#00ffff] to-[#1e88e5] text-white py-3 rounded-full shadow-lg transition-transform transform hover:scale-105">
          <span className="font-semibold">Choose File</span>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {uploadMessage && (
          <p className="mt-2 text-green-400 font-semibold">{uploadMessage}</p>
        )}

        {/* Scan Button */}
        <button
          onClick={handleScan}
          className="px-8 py-3 bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600 transition mt-4 shadow-lg transform hover:scale-105"
        >
          {loading ? "Scanning..." : "Scan"}
        </button>

        {/* Detection Meter */}
        {videoFile && (
          <div className="mt-6">
            <DetectionMeter
              loading={loading}
              result={result}
              videoName={videoFile.name}
              videoSize={(videoFile.size / (1024 * 1024)).toFixed(2)} // Convert bytes to MB
            />
          </div>
        )}

        {/* Processed Video */}
        {processedVideo && (
          <div className="mt-6">
            <h2 className="text-white text-lg font-semibold">Processed Video</h2>
            <video
              controls
              className="mt-2 shadow-lg rounded-lg"
              style={{ width: "100%", maxWidth: "1000px", height: "auto" }}
            >
              <source src={processedVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticleTest;
