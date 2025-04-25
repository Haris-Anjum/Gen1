import React, { useState, useEffect } from "react";

const DetectionMeter = ({ loading, result, videoName, videoSize }) => {
  const [progress, setProgress] = useState(0);
  const [animate, setAnimate] = useState(false);

  const getPrediction = () => {
    if (result) {
      const prediction = result.split(",")[0].replace("Prediction:", "").trim();
      return prediction;
    }
    return null;
  };

  const getConfidence = () => {
    if (result) {
      const confidenceStr = result.split(",")[1]?.replace("Confidence:", "").trim();
      return parseFloat(confidenceStr) || 0;
    }
    return 0;
  };

  const prediction = getPrediction();
  const confidence = getConfidence();

  useEffect(() => {
    if (loading) {
      setAnimate(true);
      const interval = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? 10 : prev + 10));
      }, 300);
      return () => {
        clearInterval(interval);
        setAnimate(false);
      };
    } else {
      setProgress(prediction === "Fake" ? 90 : 20);
    }
  }, [loading, prediction]);

  return (
    <div className="w-full p-6 bg-gradient-to-r from-[#0f1729]/40 to-[#1a237e]/40 rounded-xl shadow-2xl border border-cyan-500/30 backdrop-blur-md">
      {/* Header Section */}
      <div className="flex flex-col items-center mb-6">
        <div className={`text-2xl font-bold mb-2 ${
          loading ? "text-cyan-400" :
          prediction === "Fake" ? "text-red-400" : "text-green-400"
        }`}>
          {loading ? "Analyzing Video..." : prediction}
        </div>
        {!loading && result && (
          <div className="text-cyan-300 text-sm">
            Confidence: {confidence.toFixed(2)}%
          </div>
        )}
      </div>

      {/* Custom Meter */}
      <div className="relative h-4 bg-gray-800/50 rounded-full overflow-hidden mb-6 backdrop-blur-sm">
        <div
          className={`h-full ${
            animate ? "bg-gradient-to-r from-cyan-500/80 via-blue-500/80 to-cyan-500/80 bg-[length:200%_100%]" :
            prediction === "Fake" ? "bg-gradient-to-r from-red-500/80 to-red-600/80" :
            "bg-gradient-to-r from-green-500/80 to-green-600/80"
          } ${animate ? "animate-gradient" : ""}`}
          style={{
            width: `${progress}%`,
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Video Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-gray-800/30 p-3 rounded-lg backdrop-blur-sm border border-gray-700/30">
          <p className="text-cyan-300 font-semibold mb-1">File Name</p>
          <p className="text-white/90 truncate">{videoName}</p>
        </div>
        <div className="bg-gray-800/30 p-3 rounded-lg backdrop-blur-sm border border-gray-700/30">
          <p className="text-cyan-300 font-semibold mb-1">File Size</p>
          <p className="text-white/90">{videoSize} MB</p>
        </div>
      </div>

      {/* Timestamp */}
      <div className="mt-4 text-right">
        <p className="text-cyan-400/50 text-xs">{new Date().toLocaleString()}</p>
      </div>
    </div>
  );
};

export default DetectionMeter;
