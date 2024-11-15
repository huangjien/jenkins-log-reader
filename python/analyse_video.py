import hashlib
import os
import subprocess
import datetime
import ollama
import glob
import shutil
from concurrent.futures import ThreadPoolExecutor, as_completed

def calculate_checksum(file_path):
    """Calculate the SHA-256 checksum of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        # Read the file in chunks to avoid memory overload for large files
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def remove_duplicate_frames(frames):
    """Remove duplicate frames based on file checksum and return unique frames."""
    unique_frames = []
    checksums = set()

    for frame in frames:
        
        checksum = calculate_checksum(frame)
        print(frame, checksum)
        if checksum not in checksums:
            checksums.add(checksum)
            unique_frames.append(frame)
        else:
            os.remove(frame)  # Optional: delete duplicate file immediately
            print(f"Duplicate frame {frame} removed.")
    
    return unique_frames

def extract_images(video_path, output_folder, fps=1):
    """Extract images from a video at the specified frames per second (fps)."""
    os.makedirs(output_folder, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-i", video_path,
        "-vf", f"fps={fps}",
        f"{output_folder}/frame_%04d.png"
    ]
    subprocess.run(cmd, check=True)
    print(f"Images extracted to {output_folder}")

def analyze_image( frame_path, target_keyword):
    """Analyze images using llama3.2-vision and print timestamps if target is found."""

    # Analyze the image with llama3.2-vision
    result = ollama.chat(model="llama3.2-vision", stream=False, messages=[{'role': 'user', 'content': target_keyword, 'images': [frame_path]}])
    print(frame_path,"\n", result['message']['content'],"\n\n")
    # Check if target keyword is found in the analysis result
    # if target_keyword in result.lower():
    #     frame_number = int(os.path.splitext(os.path.basename(frame_path))[0].split('_')[1])
    #     timestamp = datetime.timedelta(seconds=frame_number)  # frame number corresponds to seconds with fps=1
    #     found_targets.append((video_name, timestamp))
    #     print(f"Target '{target_keyword}' found in {video_name} at {timestamp}")
    return result['message']['content']
    
def analyze_images_multithreaded(video_path, image_folder, target_keyword, max_workers=4):
    """Analyze images concurrently using multiple threads and print results if target is found."""
    frames = sorted(glob.glob(f"{image_folder}/frame_*.png"))
    frames = remove_duplicate_frames(frames)
    video_name = os.path.basename(video_path)
    found_targets = []

    # Use ThreadPoolExecutor to analyze images concurrently
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all frames for analysis
        future_to_frame = {executor.submit(analyze_image, frame, target_keyword): frame for frame in frames}
        
        # Process each completed future as it finishes
        for future in as_completed(future_to_frame):
            frame_path = future_to_frame[future]
            try:
                result_content = future.result()
                print(result_content)
                if result_content.startswith('Found') or result_content.startswith('**Found') :
                    found_targets.append((result_content, frame_path))
                    print(f"\nIssue found in {video_name} at\n {frame_path}")
            except Exception as e:
                print(f"Error processing {frame_path}: {e}")

    return found_targets


def clean_up(folder_path):
    """Delete temporary files in the specified folder."""
    shutil.rmtree(folder_path)
    print(f"Cleaned up {folder_path}")

def process_video(video_path, target_keyword="target_object"):
    """Main process to extract frames, analyze for target, and clean up."""
    temp_folder = "/tmp/video_analysis"
    try:
        # Step 1: Extract images from video
        extract_images(video_path, temp_folder, fps=1)
        
        # Step 2: Analyze each image for target presence
        results = analyze_images_multithreaded(video_path, temp_folder, target_keyword, 5)
        
        if not results:
            print("No targets found.")
        else:
            for result in results:
                result_content, timestamp = result
                print(f"\n\nTarget found in {result_content} at\n {timestamp}")
    
    finally:
        # Step 3: Clean up extracted images
        clean_up(temp_folder)

# Example usage
video_path = "/Users/jhuang/temp/test/test_video1.mov"
target_keyword = """
[Role]You are a QA. 
[Task]Your task is checking the screen shots generated by an automation tool. 
If you find something unusual, something could be a bug, tell me what you found. 
[Important]structure your output: 
First line must be \"Found\" if you found something, then new line, then with detail about what you found; 
or first line must be \"OK\", if nothing found, then no need to explain.
"""
print(datetime.datetime.now())
process_video(video_path, target_keyword)
print(datetime.datetime.now())
