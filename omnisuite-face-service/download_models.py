import os
import sys
import urllib.request

MODELS = {
    "face_detection_yunet_2023mar.onnx": [
        "https://raw.githubusercontent.com/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
        "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    ],
    "face_recognition_sface_2021dec.onnx": [
        "https://raw.githubusercontent.com/opencv/opencv_zoo/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
        "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
    ],
    "MiniFASNetV1SE.onnx": [
        "https://github.com/yakhyo/face-anti-spoofing/raw/main/models/MiniFASNetV1SE.onnx",
        "https://raw.githubusercontent.com/yakhyo/face-anti-spoofing/main/models/MiniFASNetV1SE.onnx",
    ],
    "MiniFASNetV2.onnx": [
        "https://github.com/yakhyo/face-anti-spoofing/raw/main/models/MiniFASNetV2.onnx",
        "https://raw.githubusercontent.com/yakhyo/face-anti-spoofing/main/models/MiniFASNetV2.onnx",
    ],
}

WEIGHTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "weights")
os.makedirs(WEIGHTS_DIR, exist_ok=True)

def download_file(filename, urls):
    dest = os.path.join(WEIGHTS_DIR, filename)
    if os.path.exists(dest) and os.path.getsize(dest) > 10000:
        print(f"[OK] {filename} already exists ({os.path.getsize(dest)} bytes).")
        return True

    print(f"Downloading {filename}...")
    headers = {"User-Agent": "Mozilla/5.0"}
    for url in urls:
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as response, open(dest, 'wb') as out_file:
                chunk_size = 1024 * 1024
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    out_file.write(chunk)
            if os.path.getsize(dest) > 10000:
                print(f"[SUCCESS] Downloaded {filename} ({os.path.getsize(dest)} bytes).")
                return True
            else:
                print(f"[WARN] Downloaded file too small: {dest}")
                if os.path.exists(dest):
                    os.remove(dest)
        except Exception as e:
            print(f"[WARN] Failed from {url}: {e}")
            if os.path.exists(dest):
                try:
                    os.remove(dest)
                except Exception:
                    pass
    return False

def main():
    all_ok = True
    for fname, urls in MODELS.items():
        ok = download_file(fname, urls)
        if not ok and fname != "MiniFASNetV2.onnx":
            all_ok = False

    if all_ok:
        print("\nAll essential models ready in weights/")
    else:
        print("\nSome models failed to download.")

if __name__ == "__main__":
    main()
