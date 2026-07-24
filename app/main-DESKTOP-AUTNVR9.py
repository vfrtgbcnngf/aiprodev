import uvicorn
import webbrowser
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.routes import items, auth, calendar, fortune, prediction, paintunig

app = FastAPI()

# 정적 파일 경로 설정
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# 라우터 등록
app.include_router(items.router)
app.include_router(auth.router, prefix="/auth")
app.include_router(calendar.router, prefix="/calendar")
app.include_router(fortune.router, prefix="/chat")
app.include_router(prediction.router, prefix="/api")
app.include_router(paintunig.router, prefix="/api")

# 서버 시작 시 자동 브라우저 오픈 (중복 방지)
@app.on_event("startup")
def startup_event():
    if os.environ.get("RUN_MAIN") != "true":
        webbrowser.open("http://127.0.0.1:8000/portfolio")

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)