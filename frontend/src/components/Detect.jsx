import React, { useState } from "react";
import styles from "../style";
import Footer from "../components/Footer";
import DetectionMeter from "../components/DetectionMeter"; // Import DetectionMeter

const Detect = () => {
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

  return (
    <div className="bg-primary w-full min-h-screen flex flex-col items-center justify-start overflow-y-auto">
      <h1 className="text-4xl font-bold text-white mt-8">
        Scan and Detect DeepFake Videos
      </h1>
      <p className="text-lg text-white mt-4">Upload your video here</p>

      <label className="mt-4 cursor-pointer w-96 flex justify-center items-center bg-gray-800 text-white py-3 rounded-full shadow-lg transition hover:bg-gray-700">
        <span>Choose File</span>
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

      <button
        onClick={handleScan}
        className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600 transition mt-4 shadow-lg"
      >
        {loading ? "Scanning..." : "Scan"}
      </button>

      {/* Detection Meter Component */}
      {videoFile && (
        <div className="mt-6 w-full max-w-md">
          <DetectionMeter
            loading={loading}
            result={result}
            videoName={videoFile.name}
            videoSize={(videoFile.size / (1024 * 1024)).toFixed(2)} // Convert bytes to MB
          />
        </div>
      )}

      {/* {result && (
        <p className="mt-4 text-lg font-semibold bg-white px-4 py-2 rounded-full shadow-md">
          Result: {result}
        </p>
      )} */}

      {processedVideo && (
        <div className="mt-4">
          <h2 className="text-white text-lg font-semibold">Processed Video</h2>
          <video
            controls
            className="mt-2 shadow-lg rounded-lg"
            style={{ width: "1000px", height: "auto" }} // Set fixed width and automatic height to maintain aspect ratio
          >
            <source src={processedVideo} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      )}

      {/* Footer Component */}
      {/* <Footer /> */}
    </div>
  );
};

export default Detect;
