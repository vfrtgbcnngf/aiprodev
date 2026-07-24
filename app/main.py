import os
import uvicorn
import webbrowser
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from app.routes import items, auth, calendar, fortune, prediction

app = FastAPI()

# 정적 파일 경로 설정
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# HTML 템플릿 폴더 경로 설정 (app/templates)
templates_dir = os.path.join(os.path.dirname(__file__), "templates")
templates = Jinja2Templates(directory=templates_dir)

# 루트('/') 접속 시 index.html을 화면에 렌더링 (최신 Starlette 규격에 맞게 수정)
@app.get("/")
def read_root(request: Request):
    return templates.TemplateResponse(request, "index.html", {"request": request})

# 라우터 등록
app.include_router(items.router)
app.include_router(auth.router, prefix="/auth")
app.include_router(calendar.router, prefix="/calendar")
app.include_router(fortune.router, prefix="/chat")
app.include_router(prediction.router, prefix="/api")

# 서버 시작 시 이벤트 (로컬 환경에서만 브라우저 자동 오픈)
@app.on_event("startup")
def startup_event():
    # Render 환경이 아닐 때만(로컬 테스트 시에만) 브라우저 자동 오픈
    if not os.environ.get("RENDER") and os.environ.get("RUN_MAIN") != "true":
        try:
            webbrowser.open("http://127.0.0.1:8000/portfolio")
        except Exception:
            pass

if __name__ == "__main__":
    # Render 환경이면 0.0.0.0과 Render가 주는 포트 사용, 아니면 로컬(127.0.0.1:8000) 사용
    is_render = os.environ.get("RENDER") is not None
    host = "0.0.0.0" if is_render else "127.0.0.1"
    port = int(os.environ.get("PORT", 8000))
    
    uvicorn.run("app.main:app", host=host, port=port, reload=not is_render)
