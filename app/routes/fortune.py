from fastapi import APIRouter
from pydantic import BaseModel
from google import genai
import os
import random

router = APIRouter()

# 신버전 클라이언트 초기화 (환경 변수 GEMINI_API_KEY 자동 인식)
client = genai.Client()

class FortuneRequest(BaseModel):
    name: str
    birth: str

@router.post("/fortune")
async def get_fortune(data: FortuneRequest):
    # 운세 문구 리스트
    fortunes = [
        "오늘은 예상치 못한 재물운이 들어올 수 있습니다. 로또를 사보는 건 어떨까요?",
        "대인 관계가 매우 좋습니다. 주변 사람들에게 따뜻한 말 한마디 건네보세요.",
        "학업이나 업무에서 좋은 성과를 낼 수 있는 날입니다. 집중력을 발휘해보세요!",
        "건강 상태가 최고조입니다. 가벼운 운동으로 기운을 더 끌어올려 보세요.",
        "소소한 행복이 기다리고 있습니다. 좋아하는 음식을 먹으며 여유를 즐기세요.",
        "새로운 인연을 만날 수도 있겠네요. 긍정적인 태도가 큰 행운을 가져다줍니다."
    ]
    
    # 만약 Gemini AI를 활용해 텍스트를 동적으로 생성하고 싶다면 아래 주석을 해제하고 사용하세요:
    # response = client.models.generate_content(
    #     model="gemini-2.5-flash",
    #     contents=f"{data.name}님의 생년월일 {data.birth}에 맞는 오늘의 운세를 한 줄로 지어줘."
    # )
    # selected_fortune = response.text
    
    # 현재 리스트 기반 무작위 선택 로직
    selected_fortune = random.choice(fortunes)
    
    # 0.5 ~ 1.0 사이의 랜덤 점수 생성
    random_scores = [round(random.uniform(0.5, 1.0), 1) for _ in range(5)]
    
    return {
        "fortune": f"{data.name}님의 오늘 운세: {selected_fortune}",
        "score": random_scores
    }