import sys
import argparse
import os
import cv2
import glob
import numpy as np
import torch
from PIL import Image
import pandas as pd
import torch
import torch.nn
import torchvision.transforms as transforms
import torchvision.transforms.functional as TF
from tqdm import tqdm
import io
import json
import random
import matplotlib.pyplot as plt

sys.path.append('core')
from raft import RAFT
from utils import flow_viz
from utils.utils import InputPadder
from natsort import natsorted
from utils1.utils import get_network, str2bool, to_cuda
from sklearn.metrics import accuracy_score, average_precision_score, roc_auc_score,roc_auc_score




# Set device based on command line argument
def get_device():
    parser = argparse.ArgumentParser()
    parser.add_argument('--device', type=str, default='cuda', help='Device to use (cuda or cpu)')
    args, _ = parser.parse_known_args()
    return args.device

DEVICE = get_device()


def compress_frame(frame, target_height=720, quality=80):
    """
    Resize the frame to target height (default 720p) while maintaining aspect ratio
    and apply JPEG compression at specified quality level
    
    Args:
        frame: NumPy array containing the image
        target_height: Target height in pixels (default 720 for 720p)
        quality: JPEG compression quality (0-100, default 80%)
    
    Returns:
        Compressed frame as NumPy array
    """
    # Convert to PIL Image for easier processing
    pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    
    # Calculate new dimensions maintaining aspect ratio
    width, height = pil_img.size
    aspect_ratio = width / height
    new_height = target_height
    new_width = int(new_height * aspect_ratio)
    
    # Resize the image
    resized_img = pil_img.resize((new_width, new_height), Image.LANCZOS)
    
    # Apply JPEG compression
    buffer = io.BytesIO()
    resized_img.save(buffer, format="JPEG", quality=quality)
    buffer.seek(0)
    
    # Load the compressed image back
    compressed_img = Image.open(buffer)
    
    # Convert back to OpenCV format (BGR)
    compressed_frame = cv2.cvtColor(np.array(compressed_img), cv2.COLOR_RGB2BGR)
    
    return compressed_frame


def load_image(imfile):
    img = np.array(Image.open(imfile)).astype(np.uint8)
    img = torch.from_numpy(img).permute(2, 0, 1).float()
    return img[None].to(DEVICE)


def viz(img, flo, folder_optical_flow_path, imfile1):
    img = img[0].permute(1,2,0).cpu().numpy()
    flo = flo[0].permute(1,2,0).cpu().numpy()
    
    # map flow to rgb image
    flo = flow_viz.flow_to_image(flo)
    img_flo = np.concatenate([img, flo], axis=0)

    parts = imfile1.rsplit('\\',1)
    content = parts[1]
    folder_optical_flow_path = folder_optical_flow_path+'/'+content.strip()
    cv2.imwrite(folder_optical_flow_path, flo)


def video_to_frames(video_path, output_folder):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    cap = cv2.VideoCapture(video_path)
    frame_count = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        # Apply compression to reduce memory usage while maintaining quality
        compressed_frame = compress_frame(frame, target_height=720, quality=80)
        
        frame_filename = os.path.join(output_folder, f"frame_{frame_count:05d}.png")
        cv2.imwrite(frame_filename, compressed_frame)
        frame_count += 1
    
    cap.release()

    images = glob.glob(os.path.join(output_folder, '*.png')) + \
             glob.glob(os.path.join(output_folder, '*.jpg'))
    images = sorted(images)
    
    return images


# generate optical flow images
def OF_gen(args):
    model = torch.nn.DataParallel(RAFT(args))
    model.load_state_dict(torch.load(args.model, map_location=torch.device(DEVICE)))

    model = model.module
    model.to(DEVICE)
    model.eval()

    if not os.path.exists(args.folder_optical_flow_path):
        os.makedirs(args.folder_optical_flow_path)

    with torch.no_grad():
        images = video_to_frames(args.path, args.folder_original_path)
        if not images:
            print(json.dumps({
                "error": "No frames could be extracted from the video. Please check if the video is valid.",
                "prediction": "Unknown",
                "confidence": 0.0
            }))
            sys.stdout.flush()
            sys.exit(1)
            
        images = natsorted(images)
        print(f"Processing {len(images)} frames for optical flow...", file=sys.stderr)

        for imfile1, imfile2 in zip(images[:-1], images[1:]):
            try:
                image1 = load_image(imfile1)
                image2 = load_image(imfile2)

                padder = InputPadder(image1.shape)
                image1, image2 = padder.pad(image1, image2)

                flow_low, flow_up = model(image1, image2, iters=20, test_mode=True)

                viz(image1, flow_up, args.folder_optical_flow_path, imfile1)
            except Exception as e:
                print(json.dumps({
                    "error": f"Error processing frames for optical flow: {str(e)}",
                    "prediction": "Unknown",
                    "confidence": 0.0
                }))
                sys.stdout.flush()
                sys.exit(1)


def combine_random_frames(rgb_folder, optical_folder, output_dir="temp_frames"):
    """Combines 2 random RGB frames and 2 random optical flow frames into one image."""
    os.makedirs(output_dir, exist_ok=True)
    
    # Get all frames from both folders
    rgb_frames = sorted([f for f in os.listdir(rgb_folder) if f.endswith(('.png', '.jpg'))])
    optical_frames = sorted([f for f in os.listdir(optical_folder) if f.endswith(('.png', '.jpg'))])
    
    # Select 2 random frames from each
    selected_rgb = random.sample(rgb_frames, min(2, len(rgb_frames)))
    selected_optical = random.sample(optical_frames, min(2, len(optical_frames)))
    
    # Read the images
    rgb_images = [
        cv2.cvtColor(cv2.imread(os.path.join(rgb_folder, f)), cv2.COLOR_BGR2RGB)
        for f in selected_rgb
    ]
    optical_images = [
        cv2.cvtColor(cv2.imread(os.path.join(optical_folder, f)), cv2.COLOR_BGR2RGB)
        for f in selected_optical
    ]
    
    # Create subplot
    fig, axes = plt.subplots(1, 4, figsize=(16, 4))
    
    # Plot RGB frames
    for idx, (img, fname) in enumerate(zip(rgb_images, selected_rgb)):
        axes[idx].imshow(img)
        axes[idx].set_title(f'RGB Frame: {fname}')
        axes[idx].axis('off')
    
    # Plot Optical flow frames
    for idx, (img, fname) in enumerate(zip(optical_images, selected_optical)):
        axes[idx+2].imshow(img)
        axes[idx+2].set_title(f'Optical Flow: {fname}')
        axes[idx+2].axis('off')
    
    # Save combined image
    combined_path = os.path.join(output_dir, "combined_frames.jpg")
    plt.tight_layout()
    plt.savefig(combined_path)
    plt.close()
    
    # Clean up individual frames if needed
    return combined_path


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', help="restore checkpoint",default="raft_model/raft-things.pth")
    parser.add_argument('--path', help="dataset for evaluation",default="video/000000.mp4")
    parser.add_argument('--folder_original_path', help="dataset for evaluation_frames",default="frame/000000")
    parser.add_argument('--small', action='store_true', help='use small model')
    parser.add_argument('--mixed_precision', action='store_true', help='use mixed precision')
    parser.add_argument('--alternate_corr', action='store_true', help='use efficent correlation implementation')
    parser.add_argument('--folder_optical_flow_path',help="the results to save",default="optical_result/000000")
    parser.add_argument(
        "-mop",
        "--model_optical_flow_path",
        type=str,
        default="checkpoints/optical.pth",
    )
    parser.add_argument(
        "-mor",
        "--model_original_path",
        type=str,
        default="checkpoints/original.pth",
    )
    parser.add_argument(
        "-t",
        "--threshold",
        type=float,
        default=0.5,
    )
    parser.add_argument(
        "--rgb_weight", 
        type=float, 
        default=0.7,
        help="Weight for RGB model prediction (between 0 and 1)"
    )
    parser.add_argument(
        "--adaptive_weight", 
        type=bool, 
        default=False,
        help="Use adaptive weighting based on confidence"
    )
    parser.add_argument("--use_cpu", action="store_true", help="uses gpu by default, turn on to use cpu")
    parser.add_argument("--arch", type=str, default="resnet50")
    parser.add_argument("--aug_norm", type=str2bool, default=True)
    parser.add_argument("--device", type=str, default="cuda", help="Device to use (cuda or cpu)")
    args = parser.parse_args()

    # Set device based on args
    DEVICE = args.device

    OF_gen(args)

    model_op = get_network(args.arch)
    state_dict = torch.load(args.model_optical_flow_path, map_location="cpu")
    if "model" in state_dict:
        state_dict = state_dict["model"]
    model_op.load_state_dict(state_dict)
    model_op.eval()
    if not args.use_cpu:
        model_op.cuda()

    model_or = get_network(args.arch)
    state_dict = torch.load(args.model_original_path, map_location="cpu")
    if "model" in state_dict:
        state_dict = state_dict["model"]
    model_or.load_state_dict(state_dict)
    model_or.eval()
    if not args.use_cpu:
        model_or.cuda()


    trans = transforms.Compose(
        (
            transforms.CenterCrop((448,448)),
            transforms.ToTensor(),
        )
    )

    # print("*" * 30)

    # optical_subfolder_path = args.folder_optical_flow_path
    # original_subfolder_path = args.folder_original_path


    original_subsubfolder_path = args.folder_original_path
    optical_subsubfolder_path = args.folder_optical_flow_path
                    
    #RGB frame detection
    original_file_list = sorted(glob.glob(os.path.join(original_subsubfolder_path, "*.jpg")) + glob.glob(os.path.join(original_subsubfolder_path, "*.png"))+glob.glob(os.path.join(original_subsubfolder_path, "*.JPEG")))
    original_prob_sum=0
    for img_path in tqdm(original_file_list, dynamic_ncols=True, disable=len(original_file_list) <= 1):
                        
        img = Image.open(img_path).convert("RGB")
        img = trans(img)
        if args.aug_norm:
            img = TF.normalize(img, mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        in_tens = img.unsqueeze(0)
        if not args.use_cpu:
            in_tens = in_tens.cuda()
                        
        with torch.no_grad():
            prob = model_or(in_tens).sigmoid().item()
            original_prob_sum+=prob
                            
            # print(f"original_path: {img_path}, original_pro: {prob}" )
                        
                        
    original_predict=original_prob_sum/len(original_file_list)
    # print("original prob",original_predict)
                    
    #optical flow detection
    optical_file_list = sorted(glob.glob(os.path.join(optical_subsubfolder_path, "*.jpg")) + glob.glob(os.path.join(optical_subsubfolder_path, "*.png"))+glob.glob(os.path.join(optical_subsubfolder_path, "*.JPEG")))
    
    if not optical_file_list:
        print(json.dumps({
            "error": "No optical flow frames were generated. Please check if the video contains sufficient motion.",
            "prediction": "Unknown",
            "confidence": 0.0
        }))
        sys.stdout.flush()
        sys.exit(1)
        
    optical_prob_sum=0
    for img_path in tqdm(optical_file_list, dynamic_ncols=True, disable=len(original_file_list) <= 1):
                        
        img = Image.open(img_path).convert("RGB")
        img = trans(img)
        if args.aug_norm:
            img = TF.normalize(img, mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        in_tens = img.unsqueeze(0)
        if not args.use_cpu:
            in_tens = in_tens.cuda()

        with torch.no_grad():
            prob = model_op(in_tens).sigmoid().item()
            optical_prob_sum+=prob

                    
    optical_predict=optical_prob_sum/len(optical_file_list)
    # print("optical prob",optical_predict)
    
    # Calculate confidence scores (distance from uncertain prediction 0.5)
    rgb_confidence = abs(original_predict - 0.5) * 2  # Scale to 0-1
    optical_confidence = abs(optical_predict - 0.5) * 2  # Scale to 0-1
    
    # print(f"RGB confidence: {rgb_confidence:.4f}, Optical confidence: {optical_confidence:.4f}")
    
    # Weighted prediction
    if args.adaptive_weight:
        # If both models have high confidence but disagree, prioritize RGB
        if rgb_confidence > 0.5 and optical_confidence > 0.5 and ((original_predict > 0.5) != (optical_predict > 0.5)):
            rgb_weight = 0.8
        else:
            # Adapt weights based on relative confidence
            total_confidence = rgb_confidence + optical_confidence
            rgb_weight = rgb_confidence / total_confidence if total_confidence > 0 else 0.5
        
        optical_weight = 1 - rgb_weight
        # print(f"Adaptive weights - RGB: {rgb_weight:.2f}, Optical: {optical_weight:.2f}")
    else:
        # Fixed weights
        rgb_weight = args.rgb_weight
        optical_weight = 1 - rgb_weight
        # print(f"Fixed weights - RGB: {rgb_weight:.2f}, Optical: {optical_weight:.2f}")
    
    predict = original_predict * rgb_weight + optical_predict * optical_weight
    # print(f"predict:{predict}")
    # if predict<args.threshold:
    #     print("Real video")
    # else:
    #     print("Fake video")

    final_prediction = "Real" if predict<args.threshold else "Fake"

    try:
        combined_image_path = combine_random_frames(
            args.folder_original_path,
            args.folder_optical_flow_path,
            output_dir="temp_frames"
        )
        
        # Create the final result dictionary
        result = {
            "prediction": final_prediction,
            "confidence": float(predict),
            "combined_frames": combined_image_path  # Add this to the result
        }
        
        # Print as proper JSON string
        print(json.dumps(result))
        sys.stdout.flush()
        
    except Exception as e:
        print(json.dumps({
            "error": f"Error combining frames: {str(e)}",
            "prediction": final_prediction,
            "confidence": float(predict)
        }))
        sys.stdout.flush()










