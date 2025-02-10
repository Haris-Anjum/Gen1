import tensorflow as tf
import cv2
import numpy as np
import sys
import os
import json
from tensorflow.keras.models import load_model

# Ensure a video file is provided
if len(sys.argv) < 2:
    print(json.dumps({"error": "No video file provided"}))
    sys.exit(1)

video_path = sys.argv[1]  # Get video path from command-line argument

# Ensure the video file exists
if not os.path.exists(video_path):
    print(json.dumps({"error": "Video file not found"}))
    sys.exit(1)

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
confidence_scores = []  # List to hold confidence scores for each 5th frame

while cap.isOpened():
    frame_id = int(cap.get(cv2.CAP_PROP_POS_FRAMES))  # Get current frame ID
    ret, frame = cap.read()
    if not ret:
        break

    # Process frames at specified intervals
    if frame_id % 5 == 0:
        # Convert frame to grayscale for face detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect faces in the frame
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

        # Process detected faces
        for (x, y, w, h) in faces:
            total_frames += 1  # Increment frame count

            # Extract and preprocess face region
            face_img = frame[y:y+h, x:x+w]
            face_img = cv2.resize(face_img, (128, 128)) / 255.0
            face_img = np.expand_dims(face_img, axis=0)  # Add batch dimension

            try:
                # Model prediction
                prediction = model.predict(face_img, verbose=0)  # Suppress logs
                confidence_score = float(prediction[0][0])  # Ensure it's a float
                
                predicted_class = 1 if confidence_score >= 0.5 else 0
                
                # Adjust confidence score for correct interpretation
                if predicted_class == 0:
                    confidence_score = 1 - confidence_score

                # Count real and fake frames
                if predicted_class == 1:
                    fake_frames += 1
                else:
                    real_frames += 1

                # Accumulate confidence score
                total_confidence += confidence_score

                # Append confidence score for every 5th frame
                confidence_scores.append(confidence_score)

            except Exception as e:
                print(json.dumps({"error": f"Prediction error: {str(e)}"}))
                sys.exit(1)

# Calculate final average confidence
average_confidence = round(total_confidence / total_frames, 4) if total_frames > 0 else 0

# Determine final video classification
final_prediction = "Real" if real_frames >= fake_frames else "Fake"

# Prepare JSON output
result = {
    "video": os.path.basename(video_path),
    "prediction": final_prediction,
    "confidence": average_confidence,
    "confidence_scores": confidence_scores  # Add the list of confidence scores
}

# Ensure ONLY valid JSON is printed
sys.stdout.write(json.dumps(result) + "\n")  # Avoid unwanted prints

# Release resources
cap.release()
