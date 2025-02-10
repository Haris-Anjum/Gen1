import cv2
import mediapipe as mp
import sys
import os
import subprocess
import random  # Import the random module

# Read arguments
input_video = sys.argv[1]
output_video = sys.argv[2]
confidence_score = float(sys.argv[3])  # Get the confidence score from command-line arguments

# Temporary directory to store frames
temp_dir = "temp_frames"
os.makedirs(temp_dir, exist_ok=True)

# Initialize MediaPipe FaceMesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False, 
    max_num_faces=2, 
    refine_landmarks=True, 
    min_detection_confidence=0.5, 
    min_tracking_confidence=0.5
)

# Drawing specifications
mp_drawing = mp.solutions.drawing_utils
drawing_spec = mp_drawing.DrawingSpec(thickness=1, circle_radius=1, color=(0, 0, 139))

# Open video file
cap = cv2.VideoCapture(input_video)
if not cap.isOpened():
    print("Error: Could not open video.")
    exit()

# Get video properties
frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = int(cap.get(cv2.CAP_PROP_FPS))

frame_count = 0

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    # Convert frame to RGB
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Process frame for face mesh
    results = face_mesh.process(frame_rgb)

    # Draw face mesh
    if results.multi_face_landmarks:
        for face_landmarks in results.multi_face_landmarks:
            mp_drawing.draw_landmarks(frame, face_landmarks, mp_face_mesh.FACEMESH_TESSELATION, drawing_spec, drawing_spec)
            mp_drawing.draw_landmarks(frame, face_landmarks, mp_face_mesh.FACEMESH_CONTOURS, drawing_spec, drawing_spec)

            # Get the top-right corner of the face mesh (using landmark points)
            right_eye = face_landmarks.landmark[33]  # Right eye (landmark 33)
            nose = face_landmarks.landmark[1]  # Nose (landmark 1)
            top_right = face_landmarks.landmark[263]  # Top right of the face (landmark 263)

            # Convert normalized coordinates to pixel coordinates
            h, w, _ = frame.shape
            top_right_x = int(top_right.x * w)
            top_right_y = int(top_right.y * h)

            # Display fluctuated confidence score every 5th frame
            if frame_count % 5 == 0:  # Every 5th frame
                fluctuated_score = random.uniform((confidence_score * 100) - 3, (confidence_score * 100) + 3)
                fluctuated_score = min(max(fluctuated_score, 0), 100)
                text = f"{fluctuated_score:.2f}%"  # Display the fluctuated score
            # else:
            #     text = f"{confidence_score * 100:.2f}%"  # Display the fixed confidence score

            # Put the text on the frame
            font = cv2.FONT_HERSHEY_SIMPLEX
            cv2.putText(frame, text, (top_right_x - 250, top_right_y - 10), font, 0.8, (0, 0, 139), 2, cv2.LINE_AA)

    # Save frame as an image
    frame_filename = os.path.join(temp_dir, f"frame_{frame_count:04d}.png")
    cv2.imwrite(frame_filename, frame)
    frame_count += 1

cap.release()
cv2.destroyAllWindows()

# Use FFmpeg to convert frames to MP4
ffmpeg_path = "C:/ffmpeg/ffmpeg-2025-02-06-git-6da82b4485-full_build/bin/ffmpeg.exe"
ffmpeg_command = [
    ffmpeg_path,
    "-framerate", str(fps),
    "-i", os.path.join(temp_dir, "frame_%04d.png"),
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "23",
    "-pix_fmt", "yuv420p",
    output_video
]

# Run FFmpeg
subprocess.run(ffmpeg_command, check=True)

# Clean up temporary frames
for file in os.listdir(temp_dir):
    os.remove(os.path.join(temp_dir, file))
os.rmdir(temp_dir)
