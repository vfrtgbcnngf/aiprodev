from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse
from google import genai
import os
import random

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

# API 키 설정
os.environ["GEMINI_API_KEY"] = "AQ.Ab8RN6IpBDfmlq_83AuUlELFYAa0TWzlwb4OvV3BhV2HReYmhA"
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

@router.get("/portfolio")
async def get_portfolio(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")

@router.get("/module/{module_type}")
async def get_module_data(module_type: str):
    # 모듈별 타입 분기
    if module_type == "data":
        return {"title": "📊 데이터 최적화 상태", "type": "progress", "value": random.randint(70, 99)}
    elif module_type == "predict":
        return {
            "title": "🚀 예측 분석", 
            "type": "chart", 
            "chart_config": {"labels": ["A", "B", "C"], "datasets": [{"data": [85, 92, 88]}]}
        }
    else:
        return {"title": "🤖 제미나이 어시스턴트", "type": "chat"}

@router.post("/chat")
async def chat_with_gemini(data: dict):
    try:
        # 리스트에 있는 정확한 모델명으로 변경
        response = client.models.generate_content(
            model="models/gemini-flash-lite-latest", 
            contents=data.get("message")
        )
        
        return JSONResponse(
            content={"reply": response.text},
            status_code=200
        )
        
    except Exception as e:
        # 할당량 초과(429) 에러 확인용 디버깅
        print(f"디버깅 에러: {e}")
        if "429" in str(e):
            return JSONResponse(content={"reply": "사용량이 초과되었습니다. 잠시 후 시도해주세요."}, status_code=200)
        return JSONResponse(content={"reply": f"AI 통신 오류: {str(e)}"}, status_code=500)