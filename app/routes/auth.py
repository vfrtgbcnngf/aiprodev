from fastapi import APIRouter, HTTPException
from app.database import db, get_password_hash, verify_password

router = APIRouter()

@router.post("/signup")
async def signup(user_data: dict):
    email = user_data.get('email', '').strip().lower()
    
    # [변경] 지우지 않고, 이미 존재하는지만 확인
    if await db['admin'].find_one({"email": email}):
        raise HTTPException(status_code=400, detail="이미 등록된 이메일입니다.")
    
    user_data['email'] = email
    user_data['password'] = get_password_hash(user_data['password'])
    await db['admin'].insert_one(user_data)
    
    return {"message": "회원가입 완료!"}

@router.post("/login")
async def login(user_data: dict):
    user = await db['admin'].find_one({"email": user_data['email']})
    
    # 1. 사용자가 없거나 비밀번호가 안 맞는 경우
    if not user:
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호 불일치")
    
    # 2. 비밀번호 해싱 검증 - [강력한 방어]
    try:
        if not verify_password(user_data['password'], user['password']):
            raise HTTPException(status_code=401, detail="이메일 또는 비밀번호 불일치")
    except Exception as e:
        # DB에 저장된 비밀번호 형식이 이상한 경우(유령 데이터/평문 데이터)
        print(f"DEBUG: 비밀번호 복호화 오류 발생 - {e}")
        raise HTTPException(status_code=400, detail="계정 정보가 손상되었습니다. 다시 가입해주세요.")
        
    return {"message": "로그인 성공", "email": user['email']}

@router.post("/delete")
async def delete_account(user_data: dict):
    """
    사용자 탈퇴 처리 함수
    - 클라이언트에서 전달받은 email을 기반으로 관련 데이터를 모두 삭제합니다.
    """
    # 1. 전달받은 이메일 정규화 (공백 제거)
    # DB에 "1", "2"와 같이 단순 문자열로 저장되어 있으므로 .lower()보다는 .strip()이 중요합니다.
    email = user_data.get("email", "").strip()
    
    if not email:
        raise HTTPException(status_code=400, detail="삭제할 이메일 정보가 없습니다.")
    
    print(f"DEBUG: 삭제 요청 이메일 -> '{email}'")

    # 2. 강제 청소 (Force Cleanup)
    # admin 컬렉션과 calendar 컬렉션에서 해당 이메일 값을 가진 모든 데이터를 찾아 삭제합니다.
    # 이메일 값이 정확히 일치해야 하므로, 불일치를 방지하기 위해 정규화된 이메일을 사용합니다.
    admin_res = await db['admin'].delete_many({"email": email})
    cal_res = await db['calendar'].delete_many({"email": email})
    
    # 3. 삭제 결과 로그 및 응답
    print(f"탈퇴 처리 결과 - 이메일: {email}")
    print(f"삭제된 계정: {admin_res.deleted_count}개, 삭제된 일정: {cal_res.deleted_count}개")
    
    # 4. 결과 반환
    # 하나라도 삭제되었다면 성공으로 간주합니다.
    if admin_res.deleted_count > 0 or cal_res.deleted_count > 0:
        return {
            "message": "계정과 데이터가 성공적으로 삭제되었습니다.",
            "details": {
                "deleted_admin": admin_res.deleted_count,
                "deleted_calendar": cal_res.deleted_count
            }
        }
    
    # 삭제된 항목이 전혀 없는 경우 (이미 삭제되었거나 정보 불일치)
    raise HTTPException(
        status_code=404, 
        detail=f"해당 이메일({email})로 등록된 데이터를 찾을 수 없습니다. (이미 삭제되었을 수 있습니다.)"
    )