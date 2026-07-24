import os
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

# 환경 변수에서 MONGO_URI를 가져오고, 없으면 로컬 주소를 기본값으로 사용
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")

# 비동기 클라이언트 사용
client = AsyncIOMotorClient(MONGO_URI) 
db = client["naviaiDB"]

# 비밀번호 보안 설정
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)