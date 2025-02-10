import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models
import cv2
import numpy as np
import os
import json
import sys

# Define the Model class
class Model(nn.Module):
    def __init__(self, num_classes=2, latent_dim=2048, lstm_layers=1, hidden_dim=2048, bidirectional=False):
        super(Model, self).__init__()
        
        model = models.resnext50_32x4d(pretrained=True)
        self.model = nn.Sequential(*list(model.children())[:-2])
        self.lstm = nn.LSTM(latent_dim, hidden_dim, lstm_layers, bidirectional)
        self.relu = nn.LeakyReLU()
        self.dp = nn.Dropout(0.4)
        self.linear1 = nn.Linear(2048, num_classes)
        self.avgpool = nn.AdaptiveAvgPool2d(1)

    def forward(self, x):
        batch_size, seq_length, c, h, w = x.shape
        x = x.view(batch_size * seq_length, c, h, w)
        fmap = self.model(x)
        x = self.avgpool(fmap)
        x = x.view(batch_size, seq_length, 2048)
        x_lstm, _ = self.lstm(x, None)
        return fmap, self.dp(self.linear1(x_lstm[:, -1, :]))

# Load the model with defined architecture
def load_complete_model(saved_model_path):
    model = Model(num_classes=2)  # Ensure architecture is defined before loading weights
    model.load_state_dict(torch.load(saved_model_path, map_location=torch.device('cpu')))
    model.eval()
    return model

# Extract frames from the video
def extract_frames(video_path, frame_size=(224, 224), num_frames=16):
    video = cv2.VideoCapture(video_path)
    frames = []

    while len(frames) < num_frames:
        ret, frame = video.read()
        if not ret:
            break
        frame = cv2.resize(frame, frame_size)
        frame = frame / 255.0
        frame = np.transpose(frame, (2, 0, 1))
        frames.append(frame)

    video.release()

    while len(frames) < num_frames:
        frames.append(frames[-1])

    frames = np.stack(frames, axis=0)
    return torch.tensor(frames, dtype=torch.float32).unsqueeze(0)

# Predict using the model
def predict(model, frames):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = model.to(device)
    frames = frames.to(device)

    with torch.no_grad():
        _, output = model(frames)

    probabilities = F.softmax(output, dim=1)
    predicted_class = torch.argmax(probabilities, dim=1).item()
    confidence_score = probabilities[0, predicted_class].item()

    return predicted_class, confidence_score, probabilities

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No video file provided"}))
        sys.exit(1)

    video_path = sys.argv[1]  # Get the video path from command-line argument

    if not os.path.exists(video_path):
        print(json.dumps({"error": "Video file not found"}))
        sys.exit(1)

    saved_model_path = "model/df_model.pt"
    model = load_complete_model(saved_model_path)

    frames = extract_frames(video_path)
    predicted_class, confidence_score, probabilities = predict(model, frames)

    # Prepare JSON output
    result = {
        "video": os.path.basename(video_path),
        "prediction": "Real" if predicted_class == 1 else "Fake",
        "confidence": confidence_score
    }

    print(json.dumps(result))  # Ensure output is valid JSON





































