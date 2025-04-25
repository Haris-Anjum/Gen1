import cv2
import mediapipe as mp
import sys
import os
import subprocess
import random
import json
import matplotlib.pyplot as plt

# --- Parse arguments ---
input_video = sys.argv[1]
output_video = sys.argv[2]

raw_scores = sys.argv[3]
# strip surrounding single or double quotes, if any
if (raw_scores.startswith("'") and raw_scores.endswith("'")) or \
   (raw_scores.startswith('"') and raw_scores.endswith('"')):
    raw_scores = raw_scores[1:-1]

# try JSON first, fallback to eval
try:
    confidence_scores = json.loads(raw_scores)
except json.JSONDecodeError:
    confidence_scores = eval(raw_scores)  # last resort

# ensure we have floats
confidence_scores = [float(x) for x in confidence_scores]

# --- Setup directories & FaceMesh ---
temp_dir = "temp_frames"
os.makedirs(temp_dir, exist_ok=True)

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=2,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

mp_drawing = mp.solutions.drawing_utils
drawing_spec = mp_drawing.DrawingSpec(thickness=1, circle_radius=1, color=(0, 0, 139))

# --- Open video & properties ---
cap = cv2.VideoCapture(input_video)
if not cap.isOpened():
    print("Error: Could not open video.")
    sys.exit(1)

fps = int(cap.get(cv2.CAP_PROP_FPS))

frame_count = 0
last_conf = None
conf_idx = 0

# --- Process frames ---
while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(frame_rgb)

    # update every 5 frames
    if frame_count % 5 == 0 and conf_idx < len(confidence_scores):
        last_conf = confidence_scores[conf_idx]
        conf_idx += 1

    if results.multi_face_landmarks:
        for landmarks in results.multi_face_landmarks:
            mp_drawing.draw_landmarks(frame, landmarks, mp_face_mesh.FACEMESH_TESSELATION, drawing_spec, drawing_spec)
            mp_drawing.draw_landmarks(frame, landmarks, mp_face_mesh.FACEMESH_CONTOURS,    drawing_spec, drawing_spec)

            if last_conf is not None:
                txt = f"{last_conf * 100:.2f}%"
                pt = landmarks.landmark[263]
                h, w, _ = frame.shape
                x, y = int(pt.x * w) - 250, int(pt.y * h) - 10
                cv2.putText(frame, txt, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 139), 2, cv2.LINE_AA)

    # save every frame
    fname = os.path.join(temp_dir, f"frame_{frame_count:04d}.png")
    cv2.imwrite(fname, frame)
    frame_count += 1

cap.release()
cv2.destroyAllWindows()

# --- Rebuild video with FFmpeg ---
ffmpeg_cmd = [
    "ffmpeg",
    "-framerate", str(fps),
    "-i", os.path.join(temp_dir, "frame_%04d.png"),
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    output_video
]
subprocess.run(ffmpeg_cmd, check=True)

# --- Keep 4 random frames, delete others ---
all_frames = sorted(os.listdir(temp_dir))
selected = random.sample(all_frames, min(4, len(all_frames)))
for f in all_frames:
    if f not in selected:
        os.remove(os.path.join(temp_dir, f))

print("Retained 4 random frames:", selected)

# --- Combine and save as one image ---
imgs = [
    cv2.cvtColor(cv2.imread(os.path.join(temp_dir, f)), cv2.COLOR_BGR2RGB)
    for f in selected
]

fig, axes = plt.subplots(1, 4, figsize=(16, 4))
for ax, img, f in zip(axes, imgs, selected):
    ax.imshow(img)
    ax.set_title(f)
    ax.axis('off')

# turn off extras
for i in range(len(selected), 4):
    axes[i].axis('off')

combined = os.path.join(temp_dir, "combined_anomalous_frames.jpg")
plt.tight_layout()
plt.savefig(combined)
plt.close()

# clean up the individual frames
for f in selected:
    os.remove(os.path.join(temp_dir, f))

print(f"Combined image saved as {combined}")
