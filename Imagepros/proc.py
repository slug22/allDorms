import json
from google.cloud import vision
import os
import io
import re

def authenticate_with_credentials(cred_path):
    """Authenticate using the service account JSON credentials."""
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = cred_path

def detect_text_from_image(image_path):
    """Detect text from an image using the Google Vision API."""
    # Initialize the Vision client
    client = vision.ImageAnnotatorClient()

    # Load the image into memory
    with io.open(image_path, 'rb') as image_file:
        content = image_file.read()

    # Create an image instance
    image = vision.Image(content=content)

    # Call the API to detect text
    response = client.text_detection(image=image)
    texts = response.text_annotations

    # If text is detected, return the full text (first entry in text_annotations)
    if texts:
        return texts[0].description
    else:
        return None

    # Handle errors
    if response.error.message:
        raise Exception(f'Error from Google Vision API: {response.error.message}')

def parse_text_to_json(text):
    """Parse the text into a structured JSON format."""
    result = {}
    lines = text.strip().split("\n")
    
    room_pattern = r"Room-(\d+)"  # Regex to match room numbers
    student_pattern = r"(\d+)\.\s*(\w+)\s*\((\d+)\)"  # Regex to match student details
    
    current_room = None
    
    for line in lines:
        room_match = re.match(room_pattern, line)
        student_match = re.match(student_pattern, line)

        if room_match:
            current_room = room_match.group(1)
            result[current_room] = []
        elif student_match and current_room:
            student = {
                "name": student_match.group(2),
                "id": int(student_match.group(3))
            }
            result[current_room].append(student)
        elif current_room and line.strip():  # Catch unnumbered names like "Sajid (7)"
            unstructured_match = re.search(r"(\w+)\s*\((\d+)\)", line.strip())
            if unstructured_match:
                student = {
                    "name": unstructured_match.group(1),
                    "id": int(unstructured_match.group(2))
                }
                result[current_room].append(student)
    
    return result

def process_images_in_folder(folder_path):
    """Process all images in the folder and extract text."""
    # Get all image files from the folder
    image_files = [f for f in os.listdir(folder_path) if f.endswith(('JPG', 'jpeg', 'png', 'bmp', 'gif'))]

    all_results = {}

    # Loop over each image file and process it
    for image_file in image_files:
        image_path = os.path.join(folder_path, image_file)
        print(f"Processing image: {image_path}...")

        # Extract text from the image
        extracted_text = detect_text_from_image(image_path)
        if extracted_text:
            print(f"Text from {image_file}:\n{extracted_text}")
            parsed_result = parse_text_to_json(extracted_text)
            all_results.update(parsed_result)
        else:
            print(f"No text detected in {image_file}")
    
    # Save the result to a JSON file
    with open("/Users/ashfaqueahbab/bangdorms/allDorms/Imagepros/results.json", "w") as json_file:
        json.dump(all_results, json_file, indent=4)
    print("Results saved to results.json")

if __name__ == "__main__":
    # Set the path to your credentials file (e.g., 'imagecred.json')
    cred_path = "/Users/ashfaqueahbab/bangdorms/allDorms/Imagepros/imgcred.json"
    authenticate_with_credentials(cred_path)
    
    # Set the path to the folder containing the images
    folder_path = "/Users/ashfaqueahbab/bangdorms/allDorms/Imagepros/imgs"
    process_images_in_folder(folder_path)
