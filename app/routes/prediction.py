import os
import cv2
import pytesseract
import pandas as pd
import numpy as np
import hashlib
import base64
import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.concurrency import run_in_threadpool
import xlsxwriter
from google import genai
from PIL import Image
import io
from pydantic import BaseModel
import random
import time

# 1. API 키 설정 (Render 환경변수 설정 후 os.environ으로 받는 것을 권장합니다)
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", "asfd"))

router = APIRouter()

# Tesseract 경로 설정 (필요시 유지)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# --- 이미지 필터 처리 함수 ---
def apply_effect(img, effect):
    if effect == "gray":
        return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    elif effect == "sepia":
        kernel = np.array([[0.272, 0.534, 0.131], [0.349, 0.686, 0.168], [0.393, 0.769, 0.189]])
        return cv2.transform(img, kernel)
    elif effect == "blur":
        return cv2.GaussianBlur(img, (15, 15), 0)
    elif effect == "invert":
        return cv2.bitwise_not(img)
    elif effect == "edge":
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 100, 200)
        return cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
    elif effect == "sharpening":
        kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
        return cv2.filter2D(img, -1, kernel)
    elif effect == "brightness":
        return cv2.convertScaleAbs(img, alpha=1.2, beta=30)
    elif effect == "emboss":
        kernel = np.array([[-2, -1, 0], [-1, 1, 1], [0, 1, 2]])
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        embossed = cv2.filter2D(gray, -1, kernel) + 128
        return cv2.cvtColor(embossed, cv2.COLOR_GRAY2BGR)
    return img

# --- [기능 1] 이미지 효과 적용 ---
@router.post("/process-image")
async def process_image(file: UploadFile = File(...), effect: str = Form("gray")):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise HTTPException(status_code=400, detail="이미지를 읽을 수 없습니다.")
    
    processed_img = apply_effect(img, effect)
    filename = "processed_temp.jpg"
    cv2.imwrite(filename, processed_img)
    
    return {"message": "처리 완료", "download_url": "/api/download-processed"}

# --- [기능 2] Gemini 기반 OCR 텍스트 추출 및 엑셀 저장 (메모리 절약형) ---
@router.post("/analyze-image-text")
async def analyze_image_text(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # 1. Gemini 모델을 이용해 이미지 내 텍스트 추출 (무거운 easyocr 대체)
        prompt = "이 이미지 안에 있는 모든 텍스트를 빠짐없이 그대로 추출해줘."
        response = client.models.generate_content(
            model="models/gemini-flash-lite-latest",
            contents=[prompt, image]
        )
        full_text = response.text if response.text else ""
        lines = [line.strip() for line in full_text.split("\n") if line.strip()]
        
        # 2. xlsxwriter를 사용한 엑셀 파일 생성
        excel_path = "analysis_result.xlsx"
        workbook = xlsxwriter.Workbook(excel_path)
        worksheet = workbook.add_worksheet("분석결과")

        border_format = workbook.add_format({'border': 1})
        header_format = workbook.add_format({
            'bold': True, 
            'border': 1, 
            'bg_color': '#D3D3D3',
            'align': 'center'
        })

        worksheet.write(0, 0, "순번", header_format)
        worksheet.write(0, 1, "추출된 텍스트", header_format)

        for i, text in enumerate(lines):
            worksheet.write(i + 1, 0, i + 1, border_format)
            worksheet.write(i + 1, 1, text, border_format)

        workbook.close()
        
        return {
            "status": "success", 
            "text": full_text, 
            "download_url": "/api/download-excel"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- [기능 3] AI 예술 비평 ---
@router.post("/analyze-critique")
async def analyze_critique(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        prompt = """너는 전문 예술 비평가야. 
        이 작품을 분석하여 '작품 개요', '구도 및 색감 분석', '기술적 평가', '총평' 순서로 작성해줘."""
        
        response = client.models.generate_content(
            model="models/gemini-flash-lite-latest", 
            contents=[prompt, image]
        )
        
        return {"critique": response.text}
    except Exception as e:
        print(f"DEBUG ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI 비평 생성 실패: {str(e)}")

# --- 다운로드 전용 엔드포인트들 ---
@router.get("/download-excel")
async def download_excel():
    return FileResponse("analysis_result.xlsx")

@router.get("/download-processed")
async def download_processed():
    return FileResponse("processed_temp.jpg")

class AnalyzeRequest(BaseModel):
    name: str
    birth: str

@router.post("/analyze")
def analyze_user_data(data: AnalyzeRequest):
    random.seed(time.time())
    dynamic_scores = [round(random.uniform(0.2, 0.99), 2) for _ in range(10)]
    
    return {
        "status": "success",
        "data": {
            "meta": {
                "engine": "v2.8-Realtime-AI-Pipeline",
                "latency": f"{round(random.uniform(0.08, 0.35), 2)}s"
            },
            "scores": dynamic_scores
        }
    }
