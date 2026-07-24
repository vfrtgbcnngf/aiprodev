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
from openai import OpenAI
import xlsxwriter
import easyocr
from google import genai
from PIL import Image
import io
from pydantic import BaseModel
import random
import time

# 1. API 키 설정
client = genai.Client(api_key="AQ.Ab8RN6LNzIukDtrn-jSDulMhzuQ5x_JwIOSaPqmo5UtKynlDUQ")

router = APIRouter()

# Tesseract 및 OCR 초기화
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
reader = easyocr.Reader(['ko', 'en'])

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
    # --- 새로 추가된 효과들 ---
    elif effect == "edge":
        # Canny 알고리즘을 이용한 외곽선 추출
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 100, 200)
        return cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
    elif effect == "sharpening":
        # 이미지 선명하게 만들기 (샤프닝 커널)
        kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
        return cv2.filter2D(img, -1, kernel)
    elif effect == "brightness":
        # 밝기 및 대비 증가 (알파: 1.2, 베타: 30)
        return cv2.convertScaleAbs(img, alpha=1.2, beta=30)
    elif effect == "emboss":
        # 엠보싱(조각) 효과
        kernel = np.array([[-2, -1, 0], [-1, 1, 1], [0, 1, 2]])
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        embossed = cv2.filter2D(gray, -1, kernel) + 128
        return cv2.cvtColor(embossed, cv2.COLOR_GRAY2BGR)
    return img

# --- [기능 1] 이미지 효과 적용 (파일 저장 후 URL 반환) ---
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
    
    # 프론트엔드가 기대하는 JSON 형태 반환
    return {"message": "처리 완료", "download_url": "/api/download-processed"}

# --- [기능 2] OCR 텍스트 추출 및 엑셀 저장 ---
@router.post("/analyze-image-text")
async def analyze_image_text(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        
        def run_ocr(file_bytes):
            nparr = np.frombuffer(file_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return reader.readtext(img)

        results = await run_in_threadpool(run_ocr, contents)
        
        # 1. 텍스트 추출
        full_text = "\n".join([text for (bbox, text, prob) in results])
        
        # 2. xlsxwriter를 사용한 엑셀 파일 생성 (테두리 서식 포함)
        excel_path = "analysis_result.xlsx"
        workbook = xlsxwriter.Workbook(excel_path)
        worksheet = workbook.add_worksheet("분석결과")

        # 테두리 및 헤더 서식 정의
        border_format = workbook.add_format({'border': 1})
        header_format = workbook.add_format({
            'bold': True, 
            'border': 1, 
            'bg_color': '#D3D3D3',
            'align': 'center'
        })

        # 헤더 작성
        worksheet.write(0, 0, "순번", header_format)
        worksheet.write(0, 1, "추출된 텍스트", header_format)

        # 데이터 작성 및 테두리 적용
        for i, (bbox, text, prob) in enumerate(results):
            worksheet.write(i + 1, 0, i + 1, border_format)
            worksheet.write(i + 1, 1, text, border_format)

        # 파일 저장 및 닫기
        workbook.close()
        
        # 3. 결과 반환
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
        
        # 2. 비평 요청 (gemini-1.5-flash 모델 권장)
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
    # 시드(Seed) 고정을 없애고 현재 시간을 섞어 버튼을 누를 때마다 완전히 새로운 난수 생성
    random.seed(time.time())
    
    # 0.2 ~ 0.99 사이의 완전히 무작위적인 10가지 지표 점수 생성
    dynamic_scores = [round(random.uniform(0.2, 0.99), 2) for _ in range(10)]
    
    # 레이더, 라인, 도넛 등 다른 차트 데이터도 매번 미세하게 다르게 연동되도록 구성 가능
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