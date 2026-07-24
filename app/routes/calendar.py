from fastapi import APIRouter, HTTPException
from app.database import db 
from pydantic import BaseModel
import holidays

router = APIRouter()

class Schedule(BaseModel):
    email: str
    date: str # "YYYY-MM-DD"
    content: str

@router.get("/holidays/{year}")
async def get_holidays(year: int):
    # language='ko' 옵션을 추가하여 한글 이름으로 받아옵니다.
    return {str(date): name for date, name in holidays.KR(years=year, language='ko').items()}

@router.post("/save")
async def save_schedule(schedule: Schedule):
    # 이메일 정규화 적용
    email = schedule.email.strip().lower()
    
    try:
        # upsert=True를 사용하여 같은 이메일+날짜라면 수정, 없으면 신규 생성
        await db['calendar'].update_one(
            {"email": email, "date": schedule.date},
            {"$set": {"content": schedule.content}},
            upsert=True
        )
        return {"message": "일정 저장 성공!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get/{email}")
async def get_schedules(email: str):
    # 조회 시에도 정규화 적용
    clean_email = email.strip().lower()
    schedules = await db['calendar'].find({"email": clean_email}).to_list(100)
    for s in schedules: s['_id'] = str(s['_id'])
    return schedules

@router.delete("/delete/{email}/{date}")
async def delete_schedule(email: str, date: str):
    # 삭제 시에도 정규화 적용
    clean_email = email.strip().lower()
    result = await db['calendar'].delete_one({"email": clean_email, "date": date})
    if result.deleted_count == 1:
        return {"message": "일정이 삭제되었습니다."}
    raise HTTPException(status_code=404, detail="삭제할 일정을 찾을 수 없습니다.")