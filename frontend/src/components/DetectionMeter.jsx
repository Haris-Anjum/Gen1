import React, { useState, useEffect } from "react";

const DetectionMeter = ({ loading, result, videoName, videoSize }) => {
  const [progress, setProgress] = useState(0); // Progress for meter

  // Extract prediction from result string
  const getPrediction = () => {
    if (result) {
      // Split by comma and check the first part for "Prediction:"
      const prediction = result.split(",")[0].replace("Prediction:", "").trim();
      return prediction;
    }
    return null;
  };

  const prediction = getPrediction();

  useEffect(() => {
    if (loading) {
      // Simulate a dynamic back-and-forth animation while loading
      const interval = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? 10 : prev + 10));
      }, 300);
      return () => clearInterval(interval);
    } else {
      // Set progress based on detection result
      setProgress(prediction === "Fake" ? 90 : 20);
    }
  }, [loading, prediction]);

  return (
    <div className="w-full p-4 bg-blue rounded-lg shadow-md">
      <div className="flex justify-center items-center">
        <h2
          className={`text-xl font-bold ${
            prediction === "Fake" ? "text-red-500" : "text-green-500"
          }`}
        >
          {/* Only show result if not loading */}
          {loading ? "" : result}
        </h2>
      </div>
      <div className="flex items-center justify-center mt-4">
        <div className="relative w-32 h-16">
          {/* Meter Progress */}
          <div
            className="absolute w-32 h-16 bg-gray-200 rounded-full overflow-hidden"
            style={{
              clipPath: "polygon(0 100%, 0 0, 100% 0, 100% 100%)",
            }}
          >
            <div
              className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
              style={{
                width: `${progress}%`,
                transition: "width 0.3s ease",
              }}
            ></div>
          </div>
        </div>
      </div>
      {/* Video Details */}
      <div className="mt-4 text-white">
        <p>
          <strong>Name:</strong> {videoName}
        </p>
        <p>
          <strong>Size:</strong> {videoSize} MB
        </p>
      </div>
      <p className="mt-4 text-xs text-white">{new Date().toUTCString()}</p>
    </div>
  );
};

export default DetectionMeter;
