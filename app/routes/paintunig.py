import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from google import genai
from dotenv import load_dotenv

load_dotenv() # .env 파일에서 키를 읽어옵니다.

router = APIRouter()
# 환경 변수에서 키를 읽어오도록 변경
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

@router.post("/start-finetuning")
async def start_finetuning(file: UploadFile = File(...)):
    try:
        # 1. 파일 임시 저장
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as buffer:
            buffer.write(await file.read())
        
        # 2. Google AI File API를 사용하여 파일 업로드
        # 파인튜닝은 로컬 경로가 아닌 API로 업로드된 파일 객체를 참조해야 합니다.
        uploaded_file = client.files.upload(path=temp_path)
        
        # 3. 모델 생성 요청 (업로드된 파일 객체의 이름을 사용)
        operation = client.models.create_tuned_model(
            source_model="models/gemini-1.5-flash-001",
            training_data=uploaded_file.name, 
            display_name="custom_model"
        )
        
        # 임시 파일 삭제
        os.remove(temp_path)
        
        return {"status": "success", "job_id": operation.name}
    except Exception as e:
        print(f"DEBUG ERROR: {e}") # 터미널에서 에러 상세 확인 가능
        raise HTTPException(status_code=500, detail=str(e))