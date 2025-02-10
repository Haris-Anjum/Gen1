import cv2
import mediapipe as mp
import sys
import os
import subprocess

# Read arguments
input_video = sys.argv[1]
output_video = sys.argv[2]
confidence_scores = eval(sys.argv[3])  # Get the confidence scores passed as a list

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
last_displayed_confidence = None  # This will store the last displayed confidence value
confidence_index = 0  # Index for confidence_scores

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    # Convert frame to RGB
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Process frame for face mesh
    results = face_mesh.process(frame_rgb)

    # Update confidence score every 5th frame
    if frame_count % 5 == 0:  # Every 5th frame, update the confidence score
        if confidence_index < len(confidence_scores):
            last_displayed_confidence = confidence_scores[confidence_index]
            confidence_index += 1

    # Draw face mesh and display confidence score
    if results.multi_face_landmarks:
        for face_landmarks in results.multi_face_landmarks:
            mp_drawing.draw_landmarks(frame, face_landmarks, mp_face_mesh.FACEMESH_TESSELATION, drawing_spec, drawing_spec)
            mp_drawing.draw_landmarks(frame, face_landmarks, mp_face_mesh.FACEMESH_CONTOURS, drawing_spec, drawing_spec)

            # Display the confidence score for the current block of frames
            if last_displayed_confidence is not None:
                text = f"{last_displayed_confidence * 100:.2f}%"  # Display the confidence score

                # Get position to display the text
                right_eye = face_landmarks.landmark[33]  # Right eye (landmark 33)
                nose = face_landmarks.landmark[1]  # Nose (landmark 1)
                top_right = face_landmarks.landmark[263]  # Top right of the face (landmark 263)

                # Convert normalized coordinates to pixel coordinates
                h, w, _ = frame.shape
                top_right_x = int(top_right.x * w)
                top_right_y = int(top_right.y * h)

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
ffmpeg_command = [
    "ffmpeg", 
    "-framerate", str(fps), 
    "-i", os.path.join(temp_dir, "frame_%04d.png"), 
    "-c:v", "libx264", 
    "-pix_fmt", "yuv420p", 
    output_video
]
subprocess.run(ffmpeg_command)

# Cleanup temporary frames
for frame_file in os.listdir(temp_dir):
    os.remove(os.path.join(temp_dir, frame_file))
os.rmdir(temp_dir)
