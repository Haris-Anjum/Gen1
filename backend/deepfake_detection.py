import tensorflow as tf
import cv2
import numpy as np
import sys
import os
import json
from tensorflow.keras.models import load_model

def compress_video(input_path, output_path, target_width=1280, target_height=720, target_fps=30):
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        print(json.dumps({"error": "Failed to open video for compression"}))
        sys.exit(1)

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')  # Use mp4v for .mp4 format
    out = cv2.VideoWriter(output_path, fourcc, target_fps, (target_width, target_height))

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        # Resize frame to 720p
        frame = cv2.resize(frame, (target_width, target_height))
        out.write(frame)

    cap.release()
    out.release()
    return output_path

# Ensure a video file is provided
if len(sys.argv) < 2:
    print(json.dumps({"error": "No video file provided"}))
    sys.exit(1)

original_video_path = sys.argv[1]  # Get video path from command-line argument

# Ensure the video file exists
if not os.path.exists(original_video_path):
    print(json.dumps({"error": "Video file not found"}))
    sys.exit(1)

# Compress video
compressed_video_path = "compressed_temp_video.mp4"
video_path = compress_video(original_video_path, compressed_video_path)

# Load the trained deepfake detection model
model = load_model('model/deepfake_detection_lstm.h5', compile=False)

# Define input shape
input_shape = (128, 128, 3)

# Load OpenCV's Haar Cascade for face detection
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Open the video file
cap = cv2.VideoCapture(video_path)
frame_rate = cap.get(cv2.CAP_PROP_FPS)

# Initialize counters for statistics
total_frames = 0
real_frames = 0
fake_frames = 0
total_confidence = 0.0
confidence_scores = []  # List to hold confidence scores for every 5th frame

while cap.isOpened():
    frame_id = int(cap.get(cv2.CAP_PROP_POS_FRAMES))  # Get current frame ID
    ret, frame = cap.read()
    if not ret:
        break

    # Process frames at specified intervals
    if frame_id % 5 == 0:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

        for (x, y, w, h) in faces:
            total_frames += 1
            face_img = frame[y:y+h, x:x+w]
            face_img = cv2.resize(face_img, (128, 128)) / 255.0
            face_img = np.expand_dims(face_img, axis=0)

            try:
                prediction = model.predict(face_img, verbose=0)
                confidence_score = float(prediction[0][0])
                predicted_class = 1 if confidence_score >= 0.5 else 0

                if predicted_class == 0:
                    confidence_score = 1 - confidence_score

                if predicted_class == 1:
                    fake_frames += 1
                else:
                    real_frames += 1

                total_confidence += confidence_score
                confidence_scores.append(confidence_score)

            except Exception as e:
                print(json.dumps({"error": f"Prediction error: {str(e)}"}))
                sys.exit(1)

# Final calculations
average_confidence = round(total_confidence / total_frames, 4) if total_frames > 0 else 0
final_prediction = "Real" if real_frames >= fake_frames else "Fake"

# Output result
result = {
    "video": os.path.basename(original_video_path),
    "prediction": final_prediction,
    "confidence": average_confidence,
    "confidence_scores": confidence_scores
}

sys.stdout.write(json.dumps(result) + "\n")

# Cleanup
cap.release()
if os.path.exists(compressed_video_path):
    os.remove(compressed_video_path)
