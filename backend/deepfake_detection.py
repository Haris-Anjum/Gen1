import tensorflow as tf
import cv2
import numpy as np
import sys
import os
import json
from tensorflow.keras.models import load_model
from mtcnn import MTCNN

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

# Check file extension
valid_extensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm']
file_ext = os.path.splitext(original_video_path)[1].lower()
if file_ext not in valid_extensions:
    print(json.dumps({"error": f"Invalid file type. Please upload a video file with one of these extensions: {', '.join(valid_extensions)}"}))
    sys.exit(1)

# Compress video
compressed_video_path = "compressed_temp_video.mp4"
video_path = compress_video(original_video_path, compressed_video_path)

# Load the trained deepfake detection model
model = load_model('model/deepfake_detection_lstm.h5', compile=False)

# Define input shape
input_shape = (128, 128, 3)

# Initialize MTCNN detector
detector = MTCNN()

# Initialize counters for statistics
total_frames = 0
real_frames = 0
fake_frames = 0
total_confidence = 0.0
confidence_scores = []  # List to hold confidence scores for every 5th frame
faces_detected = False  # Flag to track if any faces were detected
total_faces = 0  # Counter for total number of faces detected
frames_with_faces = 0  # Counter for frames that contain faces

# Check first two frames for faces using MTCNN
# print("Checking for faces in the video...")
cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print(json.dumps({"error": "Failed to open video for face detection"}))
    sys.exit(1)

# Check first two frames
frames_checked = 0
for _ in range(2):
    ret, frame = cap.read()
    if not ret:
        break
    
    frames_checked += 1
    # Convert BGR to RGB for MTCNN
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    faces = detector.detect_faces(rgb_frame)
    
    if len(faces) > 0:
        faces_detected = True
        total_faces += len(faces)
        frames_with_faces += 1

cap.release()

# If no faces were detected in the first two frames, throw an error
if not faces_detected or frames_with_faces == 0:
    print(json.dumps({"error": "No faces detected in the video. Please upload a video containing faces."}))
    sys.exit(1)

# print(f"Faces detected in {frames_with_faces} out of {frames_checked} frames")

# Second pass: Process frames for deepfake detection
# print("Processing video for deepfake detection...")
cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print(json.dumps({"error": "Failed to open video for deepfake detection"}))
    sys.exit(1)

while cap.isOpened():
    frame_id = int(cap.get(cv2.CAP_PROP_POS_FRAMES))
    ret, frame = cap.read()
    if not ret:
        break

    # Process frames at specified intervals
    if frame_id % 5 == 0:
        # Convert BGR to RGB for MTCNN
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        faces = detector.detect_faces(rgb_frame)

        if len(faces) > 0:
            for face in faces:
                x, y, w, h = face['box']
                # Ensure the coordinates are within the frame boundaries
                x = max(0, x)
                y = max(0, y)
                w = min(w, frame.shape[1] - x)
                h = min(h, frame.shape[0] - y)
                
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

cap.release()

# Final calculations
average_confidence = round(total_confidence / total_frames, 4) if total_frames > 0 else 0
final_prediction = "Real" if real_frames >= fake_frames else "Fake"

# Calculate face detection statistics
total_processed_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) // 5  # Approximate number of frames processed
face_detection_rate = (frames_with_faces / total_processed_frames) * 100 if total_processed_frames > 0 else 0

# Output result with face detection statistics
result = {
    "video": os.path.basename(original_video_path),
    "prediction": final_prediction,
    "confidence": average_confidence,
    "confidence_scores": confidence_scores,
    "face_detection_stats": {
        "total_faces_detected": total_faces,
        "frames_with_faces": frames_with_faces,
        "total_processed_frames": total_processed_frames,
        "face_detection_rate": round(face_detection_rate, 2)
    }
}

sys.stdout.write(json.dumps(result) + "\n")

# Cleanup
try:
    if os.path.exists(compressed_video_path):
        os.remove(compressed_video_path)
except Exception as e:
    # Ignore cleanup errors since the main processing is complete
    pass
