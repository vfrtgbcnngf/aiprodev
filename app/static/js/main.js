/**
 * main.js - 메인 통합 제어 스크립트
 */

// 1. 상태 변수 및 모달 제어
let selectedDateForAI = null;

let currentMode = 'login';

function showAuthModal(mode) {
    currentMode = mode;
    document.getElementById('modalTitle').innerText = mode === 'login' ? '로그인' : '회원가입';
    
    const fields = document.querySelectorAll('.signup-field');
    if (mode === 'signup') {
        fields.forEach(f => f.style.display = 'block');
    } else {
        fields.forEach(f => f.style.display = 'none');
    }
    document.getElementById('authModal').classList.add('show');
}

function closeAuthModal() {
    // 1. 모달 숨기기
    document.getElementById('authModal').classList.remove('show');
    
    // 2. 메시지 초기화
    document.getElementById('authMessage').innerText = "";
    
    // 3. 입력값 전체 초기화 (이메일, 비번, 이름, 전화번호, 주소 등)
    const inputs = document.querySelectorAll('#authModal input, #authModal select');
    inputs.forEach(input => {
        if (input.tagName === 'SELECT') {
            input.selectedIndex = 0; // 역할 선택은 첫 번째로
        } else {
            input.value = ""; // 나머지는 빈 값으로
        }
    });
}

// 2. 인증 처리 (회원가입/로그인)
async function processAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        document.getElementById('authMessage').innerText = "이메일과 비밀번호는 필수 입력 항목입니다.";
        return;
    }

    let payload = { email, password };
    
    if (currentMode === 'signup') {
        alert("회원가입 완료! 이제 로그인해주세요.");
        localStorage.removeItem("user"); // 가입 후엔 정보 초기화
        closeAuthModal();
    }

    const endpoint = (currentMode === 'login') ? '/auth/login' : '/auth/signup';

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        const msgBox = document.getElementById('authMessage');
        
        if (res.ok) {
            msgBox.style.color = "#00f2fe";
            msgBox.innerText = currentMode === 'login' ? "로그인 성공!" : "회원가입 완료!";
            
            if (currentMode === 'login') {
                localStorage.setItem("user", JSON.stringify({ email: email }));
                location.reload(); // 로그인 즉시 UI 갱신
            } else {
                setTimeout(closeAuthModal, 1500);
            }
        } else {
            msgBox.style.color = "#ff4d4d";
            msgBox.innerText = data.message || data.detail || "인증 실패";
        }
    } catch (err) {
        console.error("통신 에러:", err);
        document.getElementById('authMessage').innerText = "서버와 연결할 수 없습니다.";
    }
}

function logout() {
    if (confirm("로그아웃 하시겠습니까?")) {
        localStorage.removeItem("user"); // 저장된 사용자 정보 삭제
        location.reload(); // 페이지 새로고침하여 로그인 화면으로 복귀
    }
}

async function deleteAccount() {
    // 1. 저장된 사용자 정보 가져오기
    const user = JSON.parse(localStorage.getItem("user"));
    
    // 사용자가 로그인되어 있지 않다면 즉시 종료
    if (!user || !user.email) {
        alert("로그인된 사용자 정보가 없습니다.");
        return;
    }

    // 2. 서버와의 매핑을 위해 이메일 정규화 (공백 제거)
    // DB에 "1", "2"처럼 저장된 경우를 고려하여 trim()만 수행
    const cleanEmail = user.email.trim();

    // 3. 사용자 확인 절차
    if (!confirm(`정말 탈퇴하시겠습니까?\n이메일(${cleanEmail})과 관련된 모든 일정이 삭제됩니다.`)) {
        return;
    }

    try {
        // 4. 서버의 /auth/delete 엔드포인트 호출
        const res = await fetch('/auth/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail }) // 정규화된 값 전달
        });

        // 5. 서버 응답 처리
        const data = await res.json();
        
        if (res.ok) {
            // 삭제 성공 시 브라우저 정보 삭제 및 초기화
            localStorage.removeItem("user");
            alert(data.message || "탈퇴가 완료되었습니다.");
            location.reload(); // 화면 새로고침
        } else {
            // 삭제 실패 시 에러 메시지 출력
            console.error("탈퇴 실패:", data);
            alert("탈퇴 실패: " + (data.detail || "서버 오류가 발생했습니다."));
        }
    } catch (err) {
        // 네트워크 에러 처리
        console.error("통신 에러:", err);
        alert("서버와 통신하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const beforeLogin = document.getElementById('beforeLogin');
    const afterLogin = document.getElementById('afterLogin');
    
    if (user && user.email) {
        beforeLogin.style.display = 'none';
        afterLogin.style.display = 'block';
        document.getElementById('userEmailDisplay').innerText = `${user.email}님`;
    } else {
        beforeLogin.style.display = 'block';
        afterLogin.style.display = 'none';
    }
});


// [1. 말풍선 형태 유지 및 중복 차단]
function showAIToast(message) {
    // 중복 제거: 기존에 떠 있는 AI 말풍선이 있다면 모두 삭제
    document.querySelectorAll('.ai-toast').forEach(el => el.remove());

    const toast = document.createElement('div');
    toast.className = 'ai-toast'; // 기존 CSS 스타일 활용
    // 닫기 버튼 포함, 내용이 길어져도 깔끔하게 보이도록 설정
    toast.innerHTML = `
        <div style="font-size: 14px; line-height: 1.6; margin-bottom: 10px;">${message}</div>
        <button onclick="this.parentElement.remove()" style="width: 100%; cursor: pointer; padding: 5px; border-radius: 4px; border: none; background: #444; color: white;">닫기</button>
    `;
    document.body.appendChild(toast);

    // 10초 후 자동 삭제
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 10000);
}

// [2. 전체 일정 조회 로직 (봇 클릭 시 실행)]
function triggerAI() {
    // 1. 날짜가 선택되지 않았으면 알림
    if (!selectedDateForAI) {
        showAIToast("먼저 달력의 날짜를 클릭하여 선택해주세요.");
        return;
    }

    // 2. DB에서 가져온 전체 scheduleData 중 선택한 날짜와 일치하는 '모든' 데이터 찾기
    const daySchedules = scheduleData.filter(s => s.date === selectedDateForAI);
    
    // 3. 데이터가 있을 때와 없을 때 처리
    if (daySchedules.length > 0) {
        // 모든 일정을 순번(1, 2, 3...)과 함께 문자열로 합침
        const contentList = daySchedules.map((s, i) => `${i + 1}. ${s.content}`).join('<br>');
        
        // 4. 말풍선 띄우기 (전체 내용 전달)
        showAIToast(`<strong>${selectedDateForAI}</strong><br>등록된 일정:<br>${contentList}`);
    } else {
        showAIToast(`${selectedDateForAI}일에는 등록된 일정이 없습니다.`);
    }
}

function createAIIcon() {
    // 이미 버튼이 있으면 삭제
    const existingBtn = document.getElementById('aiAssistantFixed');
    if (existingBtn) existingBtn.remove();
    
    // 버튼 생성
    const aiBtn = document.createElement('div');
    aiBtn.id = 'aiAssistantFixed';
    aiBtn.className = 'ai-assistant-fixed'; // CSS 스타일 적용
    aiBtn.innerHTML = '🤖';
    
    // 클릭 이벤트 강제 주입
    aiBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 이벤트 버블링 방지
        triggerAI(); // 봇 로직 실행
    });
    
    // body에 추가
    document.body.appendChild(aiBtn);
}

// 3. 모듈 로드 및 UI 렌더링
async function loadModule(moduleType) {
    const content = document.getElementById('content');
    
    // 1. [정리] 다른 모듈로 이동 시 기존 AI 관련 요소(버튼, 말풍선 컨테이너) 강제 제거
    const existingAI = document.getElementById('aiAssistantFixed');
    const existingToast = document.getElementById('aiToastContainer');
    if (existingAI) existingAI.remove();
    if (existingToast) existingToast.remove();

    // 2. [초기화] 화면 전체 초기화
    content.innerHTML = ''; 

    // 3. [캘린더 모듈]
    if (moduleType === 'calendar') {
        content.innerHTML = `
            <div class="dashboard-panel">
                <div id="aiMessageArea" style="color: #00f2fe; text-align: center; margin: 10px; height: 25px; font-weight: bold; display: none;"></div>
                
                <div class="calendar-nav">
                    <button onclick="changeMonth(-1)">◀</button>
                    <h2 id="calendarHeader"></h2>
                    <button onclick="changeMonth(1)">▶</button>
                </div>
                <div class="calendar-grid-header">
                    <div class="sun">일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div class="sat">토</div>
                </div>
                <div id="calendarGrid" class="calendar-grid"></div>
            </div>`;
        
        // --- [AI 공 모양 아이콘 및 컨테이너 동적 생성] ---
        const toastContainer = document.createElement('div');
        toastContainer.id = 'aiToastContainer';
        document.body.appendChild(toastContainer);

        const aiBtn = document.createElement('div');
        aiBtn.id = 'aiAssistantFixed';
        aiBtn.className = 'ai-assistant-fixed';
        aiBtn.innerHTML = '🤖';
        aiBtn.onclick = triggerAI; // 캘린더에서만 동작하는 AI 트리거
        document.body.appendChild(aiBtn);
        // ---------------------------------------------
        
        await loadSchedules();
    } 
    // 4. [챗봇 모듈]
    else if (moduleType === 'generate') {
        content.innerHTML = `
            <div id="chatPanel" class="dashboard-panel chat-container">
                <h2 class="chat-title">🤖 제미나이 어시스턴트</h2>
                <div id="chatBox" class="chat-box"></div>
                <div class="input-area">
                    <textarea id="aiIn" placeholder="질문을 입력하세요..."></textarea>
                    <button class="send-btn" onclick="sendMessage()">전송</button>
                </div>
            </div>
        `;
        setupChatListeners();
    } 
    else if (moduleType === 'predict') {
        content.innerHTML = `
            <div class="dashboard-panel">
                <h2 style="margin-bottom: 20px;">🔮 AI 운세 분석</h2>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="text" id="userName" placeholder="이름을 입력하세요">
                    <input type="date" id="userBirth">
                    <button id="fortuneBtn" class="send-btn">운세 측정하기</button>
                </div>
                <div id="resultArea" style="margin-top: 30px; display: none;">
                    <div class="fortune-box"></div>
                    <div style="width: 100%; max-width: 400px; margin: 0 auto;">
                        <canvas id="fortuneChart"></canvas>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('fortuneBtn').addEventListener('click', getFortune);
    }
    else if (moduleType === 'ml-engine') {
        content.innerHTML = `
            <div class="dashboard-panel" style="max-width: 1200px; margin: 0 auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px;">
                    <div>
                        <h2 style="color: #00f2fe; margin: 0 0 5px 0;">🧠 딥러닝 & 머신러닝 다차원 예측 엔진</h2>
                        <p style="color: #aaa; margin: 0; font-size: 13px;">실시간 스트림 데이터 분석 및 AI 기반 다각도 행동 패턴 추론 대시보드</p>
                    </div>
                    <button class="send-btn" onclick="runMLPipeline()" style="background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%); color: #000; font-weight: bold; padding: 12px 25px; border-radius: 8px; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(0,242,254,0.3);">🚀 엔진 실시간 구동</button>
                </div>

                <!-- 상태 요약 카드 -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px;">
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(0,242,254,0.2); padding: 15px; border-radius: 8px; text-align: center;">
                        <span style="font-size: 12px; color: #aaa;">엔진 상태</span>
                        <h3 id="ml-status" style="color: #00f2fe; margin: 5px 0 0 0;">대기 중</h3>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(0,242,254,0.2); padding: 15px; border-radius: 8px; text-align: center;">
                        <span style="font-size: 12px; color: #aaa;">모델 버전</span>
                        <h3 id="ml-version" style="color: #fff; margin: 5px 0 0 0;">-</h3>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(0,242,254,0.2); padding: 15px; border-radius: 8px; text-align: center;">
                        <span style="font-size: 12px; color: #aaa;">응답 속도 (Latency)</span>
                        <h3 id="ml-latency" style="color: #28a745; margin: 5px 0 0 0;">-</h3>
                    </div>
                </div>

                <!-- 4가지 다양한 차트 그리드 배치 -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                    <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                        <h4 style="margin-top: 0; color: #00f2fe; font-size: 14px;">📊 사용자 행동 분석 지표 (가로 막대)</h4>
                        <div style="height: 250px; position: relative;"><canvas id="chartBar"></canvas></div>
                    </div>
                    <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                        <h4 style="margin-top: 0; color: #ffcc00; font-size: 14px;">🕸️ 다차원 역량 평가 (레이더 맵)</h4>
                        <div style="height: 250px; position: relative;"><canvas id="chartRadar"></canvas></div>
                    </div>
                    <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                        <h4 style="margin-top: 0; color: #28a745; font-size: 14px;">📈 시간별 트렌드 변화 (라인 그래프)</h4>
                        <div style="height: 250px; position: relative;"><canvas id="chartLine"></canvas></div>
                    </div>
                    <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                        <h4 style="margin-top: 0; color: #ff4d4d; font-size: 14px;">🍩 플랫폼 기여도 점유율 (도넛 차트)</h4>
                        <div style="height: 250px; position: relative;"><canvas id="chartDoughnut"></canvas></div>
                    </div>
                </div>
            </div>
        `;
    }
    else if (moduleType === 'image-analyzer') {
        content.innerHTML = `
            <div class="dashboard-panel">
                <h2 style="margin-bottom: 20px; color: #00f2fe;">🖼️ AI 이미지 스튜디오</h2>
                
                <div class="upload-container">
                    <input type="file" id="imageInput" accept="image/*" onchange="previewImage()" style="display:none;">
                    <button class="nav-btn" onclick="document.getElementById('imageInput').click()" style="width: 200px;">파일 선택하기</button>
                    <p id="fileName" style="margin-top:10px; color:#aaa;">선택된 파일 없음</p>
                    <img id="imagePreview" style="max-width:200px; display:none; margin: 15px auto; border-radius: 8px; border: 2px solid #00f2fe;">
                </div>

                <div class="action-card-group">
                    <div class="action-card" onclick="analyzeCritique()">
                        <span>🎨</span><strong>작품 비평</strong>
                    </div>
                    <div class="action-card" onclick="analyzeOCR()">
                        <span>📝</span><strong>글자 분석</strong>
                    </div>
                    <div class="action-card" onclick="showSpecialEffectMenu()">
                        <span>✨</span><strong>특수 효과</strong>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <button class="nav-btn" onclick="downloadExcel()" style="background: #28a745; width: 100%; max-width: 300px;">💾 분석 결과 엑셀 다운로드</button>
                </div>
                
                <div id="analysisResult" class="result-box" style="margin-top: 25px;">
                    <p style="color:#666; text-align:center;">분석 결과가 여기에 표시됩니다.</p>
                </div>
            </div>
        `;
    }
    // 5. [기타 모듈]
    else {
        content.innerHTML = `<div class="dashboard-panel"><h3>데이터 불러오는 중...</h3></div>`;
        try {
            const res = await fetch(`/module/${moduleType}`);
            const data = await res.json();
            
            if (data.type === 'chart') {
                content.innerHTML = `<div class="dashboard-panel"><h2>${data.title}</h2><canvas id="moduleChart"></canvas></div>`;
                new Chart(document.getElementById('moduleChart').getContext('2d'), {
                    type: 'line',
                    data: { labels: data.chart_config.labels, datasets: data.chart_config.datasets }
                });
            } else {
                content.innerHTML = `<div class="dashboard-panel"><h2>${data.title}</h2><p>데이터 준비 중입니다.</p></div>`;
            }
        } catch (err) {
            content.innerHTML = `<div class="dashboard-panel"><h2>모듈을 불러오는 중 오류가 발생했습니다.</h2></div>`;
        }
    }
}

// 4. 채팅 전송 로직
function setupChatListeners() {
    const input = document.getElementById('aiIn');
    input?.addEventListener('keydown', (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
}

async function sendMessage() {
    const input = document.getElementById('aiIn');
    const chatBox = document.getElementById('chatBox');
    const userMsg = input.value.trim();
    if (!userMsg) return;

    // 사용자 메시지 추가
    chatBox.innerHTML += `<div class="chat-message user">${userMsg}</div>`;
    input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const res = await fetch('/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({message: userMsg})
        });
        const data = await res.json();
        
        // 봇 응답 메시지 추가
        chatBox.innerHTML += `<div class="chat-message bot">${res.ok ? data.reply : '오류 발생'}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch {
        chatBox.innerHTML += `<div class="chat-message bot">통신 오류가 발생했습니다.</div>`;
    }
}

async function saveSchedule() {
    const user = JSON.parse(localStorage.getItem("user"));
    const date = document.getElementById('selectedDateTitle').innerText;
    const content = document.getElementById('aiCalendarInput').value.trim();

  

    if (!content) {
        alert("내용을 입력해주세요.");
        return;
    }

    try {
        const res = await fetch('/calendar/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: user.email.toLowerCase(), 
                date: date, 
                content: content 
            })
        });

        if (res.ok) {
            // [수정] 1. 일정 저장 후 AI 알림창 띄우기
            showAIToast(`${document.getElementById('selectedDateTitle').innerText} 일정 등록이 완료되었습니다.`);
            // 2. 모달 닫기
            closeDateModal();
            
            // 3. 캘린더 새로고침
            await loadSchedules();
            
        } else {
            alert("저장 실패");
        }
    } catch (err) {
        alert("서버 오류 발생");
    }
}

function showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

// 모달 닫기 함수
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let holidayData = {};
let scheduleData = [];
let lastDay = 31;

// 2. 서버에서 데이터 가져오기 및 달력 그리기 호출
async function loadSchedules() {
    const user = JSON.parse(localStorage.getItem("user"));
    const header = document.getElementById('calendarHeader');

    // 공휴일은 항상 불러옴
    const resH = await fetch(`/calendar/holidays/${currentYear}`);
    holidayData = await resH.json();

    if (user && user.email) {
        try {
            const resS = await fetch(`/calendar/get/${user.email.toLowerCase()}`);
            scheduleData = await resS.json();
            header.innerText = `${currentYear}년 ${currentMonth + 1}월`;
        } catch (e) {
            scheduleData = [];
        }
    } else {
        scheduleData = [];
        header.innerText = `${currentYear}년 ${currentMonth + 1}월`;
    }
    
    // 이 위치가 중요합니다. if문 밖으로 꺼내서 무조건 렌더링 실행!
    renderCalendar();
}

// 3. 달력 렌더링 (하나로 통합)
function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const user = JSON.parse(localStorage.getItem("user"));
    if (!grid) return;

    grid.innerHTML = '';
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

    // 1. 빈 칸 생성
    for (let i = 0; i < firstDayIndex; i++) {
        grid.innerHTML += `<div></div>`;
    }

    // 2. 날짜 및 공휴일/일정 렌더링
    for (let day = 1; day <= lastDay; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const holiday = holidayData[dateStr];
        const schedule = (user && user.email) ? scheduleData.find(s => s.date === dateStr) : null;
        
        const dayOfWeek = new Date(currentYear, currentMonth, day).getDay();
        const isRed = (dayOfWeek === 0 || dayOfWeek === 6 || holiday);
        
        const dayDiv = document.createElement('div');
        dayDiv.className = `calendar-day ${isRed ? 'sun' : ''}`;
        
        // 날짜 칸 내용 구성
        dayDiv.innerHTML = `
            <span class="day-number">${day}</span>
            ${holiday ? `<div class="holiday-text">${holiday}</div>` : ''}
            ${schedule ? `<div class="schedule-text">${schedule.content.substring(0, 4)}..</div>` : ''}
        `;

        // [핵심] 날짜 클릭 시 AI가 해당 날짜를 기억하게 함
        dayDiv.onclick = (e) => {
            e.stopPropagation(); // AI 버튼과 이벤트 충돌 방지
            selectedDateForAI = dateStr; 
            
            if (user) {
                openDateModal(dateStr);
            } else {
                alert('로그인이 필요한 서비스입니다.');
            }
        };

        grid.appendChild(dayDiv);
        createAIIcon();
    }
}
// 달 넘기기 및 새로고침
function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    else if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    loadSchedules();
}

// 모달 제어
function openDateModal(dateStr) {
    document.getElementById('selectedDateTitle').innerText = dateStr;
    const schedule = scheduleData.find(s => s.date === dateStr);
    document.getElementById('aiCalendarInput').value = schedule ? schedule.content : '';
    document.getElementById('dateModal').classList.add('show');
}

function closeDateModal() {
    document.getElementById('dateModal').classList.remove('show');
}





// 일정 삭제 함수
async function deleteSchedule() {
    const user = JSON.parse(localStorage.getItem("user"));
    const date = document.getElementById('selectedDateTitle').innerText;

    const res = await fetch(`/calendar/delete/${user.email}/${date}`, { method: 'DELETE' });
    
    if (res.ok) {
        alert("삭제 완료!");
        closeDateModal();
        loadSchedules(); // 데이터 새로고침
    }
}

function showAICalendarMessage(message) {
    const msgContainer = document.getElementById('aiMessageArea'); // HTML에 이 ID가 있어야 함
    if (!msgContainer) return;
    
    msgContainer.innerText = `🤖 AI: ${message}`;
    msgContainer.style.display = 'block';
    
    // 3초 후 자동 사라짐
    setTimeout(() => { msgContainer.style.display = 'none'; }, 3000);
}

async function getFortune() {
    const name = document.getElementById('userName').value;
    const birth = document.getElementById('userBirth').value;
    const fortuneBox = document.querySelector('.fortune-box');
    const resultArea = document.getElementById('resultArea');

    // 1. 입력값 검증
    if (!name || !birth) {
        alert("이름과 생일을 입력하세요!");
        return;
    }

    // 2. 결과 영역 표시 및 안내 문구
    resultArea.style.display = 'block';
    fortuneBox.innerText = "🔮 운세를 분석 중입니다...";

    try {
        // 3. 서버 호출 (prefix가 '/chat'이므로 '/chat/fortune'으로 호출)
        const res = await fetch('/chat/fortune', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name: name, birth: birth })
        });
        
        if (!res.ok) throw new Error('서버 응답 오류');
        
        const data = await res.json();
        
        // 4. 운세 문구 출력
        fortuneBox.innerText = data.fortune;
        
        // 5. 차트 렌더링 (이전 차트가 있으면 삭제)
        const ctx = document.getElementById('fortuneChart').getContext('2d');
        if (window.fortuneChartInstance) {
            window.fortuneChartInstance.destroy();
        }
        
        // 6. 새로운 차트 생성
        window.fortuneChartInstance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['재물', '애정', '건강', '학업', '대인'],
                datasets: [{
                    label: '운세 지수',
                    data: data.score,
                    backgroundColor: 'rgba(0, 242, 254, 0.2)', // 살짝 투명하게
                    borderColor: '#00f2fe',
                    borderWidth: 3,
                    pointBackgroundColor: '#00f2fe' // 꼭짓점 포인트 강조
                }]
            },
            options: {
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255, 255, 255, 0.2)' }, // 방사형 선 색상
                        grid: { color: 'rgba(255, 255, 255, 0.2)' },       // 눈금 선 색상
                        pointLabels: { color: 'white', font: { size: 14 } }, // 항목 라벨(재물, 애정 등)
                        ticks: {
                            stepSize: 0.2,    // 눈금 간격 (0.2 단위)
                            backdropColor: 'transparent', // 숫자 배경 투명
                            color: '#aaa',    // 숫자 색상
                            font: { size: 10 }
                        },
                        suggestedMin: 0,
                        suggestedMax: 1
                    }
                },
                plugins: {
                    legend: { labels: { color: 'white' } } // 범례 색상
                }
            }
        });
    } catch (err) {
        console.error("운세 에러:", err);
        fortuneBox.innerText = "분석 실패: 서버와 연결할 수 없습니다.";
    }
}


async function runMLPipeline() {
    const statusEl = document.getElementById('ml-status');
    const versionEl = document.getElementById('ml-version');
    const latencyEl = document.getElementById('ml-latency');

    statusEl.innerText = "분석 중...";
    statusEl.style.color = "#ffcc00";

    try {
        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: '홍길동', birth: '2026-07-17' })
        });
        
        const result = await res.json();
        
        if (result.status === 'success') {
            statusEl.innerText = "정상 구동 완료";
            statusEl.style.color = "#28a745";
            versionEl.innerText = result.data.meta.engine;
            latencyEl.innerText = result.data.meta.latency;
            
            // 백엔드 점수를 기반으로 하되, 매번 미세하게 추가 랜덤을 섞어 완벽히 다르게 표현
            const baseScores = result.data.scores;
            const scores = baseScores.map(val => Math.min(0.99, Math.max(0.15, +(val + (Math.random() * 0.3 - 0.15)).toFixed(2))));
            
            // 1. 가로 막대 차트 (Bar)
            if (window.cBar) window.cBar.destroy();
            window.cBar = new Chart(document.getElementById('chartBar').getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['구매의사', '검색빈도', '체류시간', '광고클릭', '재방문율', '장바구니', '로그인유지', '쿠폰사용', '공유하기', '추천지수'],
                    datasets: [{ label: '행동 지표', data: scores, backgroundColor: '#00f2fe' }]
                },
                options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { max: 1, ticks: { color: '#aaa' } }, y: { ticks: { color: '#aaa', font: { size: 10 } } } }, plugins: { legend: { display: false } } }
            });

            // 2. 레이더 차트 (Radar) - 매번 랜덤값 생성
            const radarData = Array.from({length: 5}, () => +(Math.random() * 0.5 + 0.5).toFixed(2));
            if (window.cRadar) window.cRadar.destroy();
            window.cRadar = new Chart(document.getElementById('chartRadar').getContext('2d'), {
                type: 'radar',
                data: {
                    labels: ['안정성', '성장성', '활동성', '충성도', '반응속도'],
                    datasets: [{ label: '역량 지수', data: radarData, backgroundColor: 'rgba(255, 204, 0, 0.2)', borderColor: '#ffcc00', borderWidth: 2 }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { r: { ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: '#fff' } } }, plugins: { legend: { display: false } } }
            });

            // 3. 라인 차트 (Line) - 매번 랜덤값 생성
            const lineData = Array.from({length: 5}, () => +(Math.random() * 0.6 + 0.3).toFixed(2));
            if (window.cLine) window.cLine.destroy();
            window.cLine = new Chart(document.getElementById('chartLine').getContext('2d'), {
                type: 'line',
                data: {
                    labels: ['1주차', '2주차', '3주차', '4주차', '5주차'],
                    datasets: [{ label: '트렌드 추이', data: lineData, borderColor: '#28a745', backgroundColor: 'rgba(40, 167, 69, 0.1)', fill: true, tension: 0.4 }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: '#aaa' } }, y: { ticks: { color: '#aaa' } } }, plugins: { legend: { display: false } } }
            });

            // 4. 도넛 차트 (Doughnut) - 매번 랜덤 비율 생성
            let d1 = Math.floor(Math.random() * 40) + 30;
            let d2 = Math.floor(Math.random() * 30) + 10;
            let d3 = Math.floor(Math.random() * 15) + 5;
            let d4 = 100 - (d1 + d2 + d3);
            if (window.cDoughnut) window.cDoughnut.destroy();
            window.cDoughnut = new Chart(document.getElementById('chartDoughnut').getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['모바일', 'PC', '태블릿', '기타'],
                    datasets: [{ data: [d1, d2, d3, d4], backgroundColor: ['#00f2fe', '#4facfe', '#ffcc00', '#ff4d4d'] }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#fff', boxWidth: 12 } } } }
            });
        }
    } catch (err) {
        statusEl.innerText = "오류 발생";
        statusEl.style.color = "#ff4d4d";
    }
}


async function analyzeCritique() {
    const fileInput = document.getElementById('imageInput');
    const resBox = document.getElementById('analysisResult');
    
    if (!fileInput.files[0]) {
        alert("이미지를 먼저 선택해주세요.");
        return;
    }
    
    resBox.innerHTML = "🎨 작품 비평 분석 중...";
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    
    try {
        const res = await fetch('/api/analyze-critique', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "분석 실패");
        
        resBox.innerHTML = `<div style="color: #00f2fe;">🎨 작품 비평 결과</div><p style="text-align:left; color:#fff;">${data.critique}</p>`;
    } catch (err) {
        resBox.innerText = "오류 발생: " + err.message;
    }
}

// [기능 2] 글자 분석(OCR) 및 엑셀 다운로드
async function analyzeOCR() {
    const fileInput = document.getElementById('imageInput');
    const resBox = document.getElementById('analysisResult');
    
    if (!fileInput.files[0]) {
        alert("이미지를 먼저 선택해주세요.");
        return;
    }
    
    resBox.innerHTML = "🤖 텍스트 분석 및 엑셀 생성 중...";
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        const response = await fetch('/api/analyze-image-text', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "분석 실패");

        resBox.innerHTML = `
            <div style="color: #00f2fe; margin-bottom: 10px;">✅ 분석 결과</div>
            <div style="background: #1a1a1a; padding: 15px; border-radius: 8px; border: 1px solid #444; color: #fff; text-align: left; white-space: pre-wrap; margin-bottom: 15px;">
                ${data.text}
            </div>
            <a href="${data.download_url}" style="color: #ffffff; background: #28a745; text-decoration: none; padding: 10px 20px; border-radius: 5px; display: inline-block;">
                📥 엑셀 결과 다운로드
            </a>
        `;
    } catch (error) {
        resBox.innerText = "오류 발생: " + error.message;
    }
}

// [기능 3] 이미지 꾸미기(필터 적용)
async function applyEffect(effect) {
    const fileInput = document.getElementById('imageInput');
    if (!fileInput.files[0]) {
        alert("이미지를 먼저 선택해주세요.");
        return;
    }
    
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    formData.append("effect", effect);
    
    try {
        const res = await fetch('/api/process-image', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "필터 적용 실패");
        
        window.location.href = data.download_url;
    } catch (err) {
        alert("오류 발생: " + err.message);
    }
}

function previewImage() {
    const fileInput = document.getElementById('imageInput');
    const fileNameDisplay = document.getElementById('fileName');
    const imagePreview = document.getElementById('imagePreview');
    
    if (fileInput.files.length > 0) {
        fileNameDisplay.innerText = fileInput.files[0].name;
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
}

function downloadExcel() {
    window.location.href = '/api/download-excel';
}

// 1. 특수 효과 메뉴를 하단 큰 네모 칸(analysisResult)에 표시
// 1. 특수 효과 메뉴를 하단 큰 네모 칸(analysisResult)에 표시
function showSpecialEffectMenu() {
    const fileInput = document.getElementById('imageInput');
    if (!fileInput.files || !fileInput.files.length === 0) {
        alert("먼저 상단에서 이미지를 선택해주세요!");
        return;
    }

    const effects = [
        { id: 'gray', label: '흑백', icon: '📷' },
        { id: 'sepia', label: '세피아', icon: '📜' },
        { id: 'blur', label: '블러', icon: '💧' },
        { id: 'invert', label: '반전', icon: '🔄' },
        { id: 'edge', label: '외곽선', icon: '✏️' },
        { id: 'sharpening', label: '선명하게', icon: '💎' },
        { id: 'brightness', label: '화사하게', icon: '☀️' },
        { id: 'emboss', label: '엠보싱', icon: '🗿' }
    ];

    const resultBox = document.getElementById('analysisResult');
    resultBox.innerHTML = `
        <div style="text-align: center; padding: 10px;">
            <p style="color: #00f2fe; margin-bottom: 20px; font-weight: bold; font-size: 16px;">✨ 적용할 특수 효과를 선택하세요</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 12px; max-width: 600px; margin: 0 auto;">
                ${effects.map(eff => `
                    <button onclick="applyAndDisplayEffect('${eff.id}')" style="
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(0, 242, 254, 0.3);
                        border-radius: 8px;
                        padding: 12px 8px;
                        color: #ffffff;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 6px;
                    " onmouseover="this.style.background='rgba(0, 242, 254, 0.15)'; this.style.borderColor='#00f2fe';" 
                       onmouseout="this.style.background='rgba(255, 255, 255, 0.05)'; this.style.borderColor='rgba(0, 242, 254, 0.3)';">
                        <span style="font-size: 18px;">${eff.icon}</span>
                        <span style="font-size: 13px; font-weight: 500;">${eff.label}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

// 2. 선택한 효과를 백엔드로 전송하고 변환된 이미지 및 다운로드 버튼 출력
// 2. 선택한 효과를 백엔드로 전송하고 변환된 이미지 및 다운로드 버튼 출력
async function applyAndDisplayEffect(effectType) {
    const fileInput = document.getElementById('imageInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert("업로드된 이미지가 없습니다.");
        return;
    }

    const formData = new FormData();
    formData.append('file', file); // 백엔드에서 기대하는 키값 'file'과 일치시킴
    formData.append('effect', effectType);

    const resultBox = document.getElementById('analysisResult');
    resultBox.innerHTML = `<p style="color:#aaa; text-align:center;">이미지 변환 중...</p>`;

    try {
        // 백엔드 라우터 경로인 '/api/process-image'로 수정
        const response = await fetch('/api/process-image', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // 브라우저 캐시 방지를 위한 타임스탬프 추가
            const timestamp = new Date().getTime();
            const imageUrl = `${data.download_url}?t=${timestamp}`;

            resultBox.innerHTML = `
                <div style="text-align: center;">
                    <p style="color: #00f2fe; margin-bottom: 10px; font-weight: bold;">✨ 변환된 이미지 (${effectType})</p>
                    <img src="${imageUrl}" style="max-width: 100%; max-height: 250px; border-radius: 8px; border: 2px solid #00f2fe; margin-bottom: 15px;" /><br>
                    <a href="${data.download_url}" download="processed_image.jpg" class="nav-btn" style="display: inline-block; background: #00f2fe; color: #000; text-decoration: none; width: auto; padding: 10px 20px; font-weight: bold;">
                        📥 변환된 이미지 다운로드
                    </a>
                </div>
            `;
        } else {
            resultBox.innerHTML = `<p style="color: #ff6b6b; text-align: center;">효과 적용 실패: ${data.detail || '알 수 없는 오류'}</p>`;
        }
    } catch (error) {
        console.error(error);
        resultBox.innerHTML = `<p style="color: #ff6b6b; text-align: center;">서버 통신 오류가 발생했습니다.</p>`;
    }
}