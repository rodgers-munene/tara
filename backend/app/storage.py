import io
import os
from uuid import uuid4

import boto3
from fastapi import HTTPException, UploadFile
from PIL import Image

REGION = os.getenv("AWS_REGION", "eu-west-1")
BUCKET = os.getenv("S3_BUCKET_NAME")
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10MB, before decoding
MAX_EDGE = 800

_s3 = boto3.client("s3", region_name=REGION)


def upload_image(file: UploadFile, prefix: str) -> str:
    contents = file.file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Image is too large (max 10MB)")

    try:
        img = Image.open(io.BytesIO(contents))
        img.load()
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read this as an image")
    
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
    img.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
    
    buffer = io.BytesIO()
    img.save(buffer, format="WEBP", quality=80)
    
    key = f"{prefix}/{uuid4().hex}.webp"
    _s3.put_object(Bucket=BUCKET, Key=key, Body=buffer.getvalue(), ContentType="image/webp")

    return f"https://{BUCKET}.s3.{REGION}.amazonaws.com/{key}"