// 시작 안내 팝업 관련 요소
const introModal = document.getElementById('introModal');
const startBtn = document.getElementById('startBtn');

// 화면 단계 요소
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');
const step4 = document.getElementById('step4'); // 결과 화면

// 폼 및 버튼 요소
const form = document.getElementById('surveyForm');
const nextBtn1 = document.getElementById('nextBtn1');
const nextBtn2 = document.getElementById('nextBtn2');
const prevBtn1 = document.getElementById('prevBtn1');
const prevBtn2 = document.getElementById('prevBtn2');
const resetBtn = document.getElementById('resetBtn'); 
const resultData = document.getElementById('resultData');

// AI 결과 요소
const aiLoading = document.getElementById('aiLoading');
const aiResult = document.getElementById('aiResult');

// 카운터 요소
const participantCountEl = document.getElementById('participantCount');
let currentCount = parseInt(localStorage.getItem('kuSurveyCount') || '0', 10);
participantCountEl.textContent = currentCount;

const mainHeader = document.getElementById('mainHeader');

// === 설정 버튼(우측 하단) 시스템 (웹 배포용) ===
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const changeApiBtn = document.getElementById('changeApiBtn');
const geminiModelInput = document.getElementById('geminiModel');

const defaultApiKey = 'AQ.Ab8RN6I1yk20JUnbUvzBJkchLoLZ9edN29DJ84eBMZYDyG1ZfQ';

// 로컬 스토리지에서 저장된 설정 불러오기
if (localStorage.getItem('geminiModel')) geminiModelInput.value = localStorage.getItem('geminiModel');

settingsBtn.addEventListener('click', () => { settingsModal.classList.remove('hidden'); });
closeSettingsBtn.addEventListener('click', () => { settingsModal.classList.add('hidden'); });

changeApiBtn.addEventListener('click', () => {
  const newKey = prompt("새로운 Google Gemini API 키를 입력하세요.\n(비워두고 확인을 누르시면 다시 기본 제공 키로 초기화됩니다.)");
  if (newKey !== null) {
    if (newKey.trim() === '') {
      localStorage.removeItem('geminiApiKey');
      alert("기본 제공 키로 초기화되었습니다.");
    } else {
      localStorage.setItem('geminiApiKey', newKey.trim());
      alert("개인 API 키가 성공적으로 임시 등록되었습니다.");
    }
  }
});

saveSettingsBtn.addEventListener('click', () => {
  localStorage.setItem('geminiModel', geminiModelInput.value);
  alert('설정이 성공적으로 저장되었습니다.');
  settingsModal.classList.add('hidden');
});
// =========================

startBtn.addEventListener('click', () => {
  introModal.classList.add('hidden');
});

// Step 1 -> Step 2
nextBtn1.addEventListener('click', () => {
  const name = document.getElementById('name').value;
  const personnel = document.getElementById('personnel').value;
  const department = document.getElementById('department').value;

  if (!name || !personnel || !department) {
    alert('이름, 학번, 학과를 모두 입력해주세요.');
    return;
  }
  step1.classList.add('hidden');
  step2.classList.remove('hidden');
});

// Step 2 -> Step 1
prevBtn1.addEventListener('click', () => {
  step2.classList.add('hidden');
  step1.classList.remove('hidden');
});

// Step 2 -> Step 3
nextBtn2.addEventListener('click', () => {
  for (let i = 1; i <= 3; i++) {
    const sName = document.getElementById(`subject_name_${i}`).value;
    const sCode = document.getElementById(`subject_code_${i}`).value;
    const sSec = document.getElementById(`class_section_${i}`).value;

    if (!sName || !sCode || !sSec) {
      alert(`${i}번 희망 과목의 정보를 모두 입력해주세요.`);
      return;
    }
  }
  step2.classList.add('hidden');
  step3.classList.remove('hidden');
});

// Step 3 -> Step 2
prevBtn2.addEventListener('click', () => {
  step3.classList.add('hidden');
  step2.classList.remove('hidden');
});

// Step 3 폼 제출 (제출하기 -> 구글 API 통신 -> Step 4)
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value;
  const personnel = document.getElementById('personnel').value;
  const department = document.getElementById('department').value;
  const expectations = document.getElementById('expectations').value;

  const courses = [];
  for (let i = 1; i <= 3; i++) {
    courses.push({
      name: document.getElementById(`subject_name_${i}`).value,
      code: document.getElementById(`subject_code_${i}`).value,
      section: document.getElementById(`class_section_${i}`).value
    });
  }

  // 카운트 증가 로직
  currentCount += 1;
  localStorage.setItem('kuSurveyCount', currentCount.toString());
  participantCountEl.textContent = currentCount;

  // 기본 정보 출력 세팅
  resultData.innerHTML = `
    <strong>이름:</strong> ${name} <br>
    <strong>학번:</strong> ${personnel} <br>
    <strong>학과:</strong> ${department} <br><br>
    <strong>[입력하신 희망 과목]</strong><br>
    1️⃣ ${courses[0].name} (${courses[0].code}) - ${courses[0].section}분반<br>
    2️⃣ ${courses[1].name} (${courses[1].code}) - ${courses[1].section}분반<br>
    3️⃣ ${courses[2].name} (${courses[2].code}) - ${courses[2].section}분반
  `;

  mainHeader.style.display = 'none';
  form.style.display = 'none';
  step3.classList.add('hidden');
  step4.classList.remove('hidden');

  // === 진짜 구글 Gemini API 통신 로직 ===
  const apiKey = localStorage.getItem('geminiApiKey') || defaultApiKey;
  const selectedModel = localStorage.getItem('geminiModel') || 'gemini-1.5-flash';

  aiLoading.style.display = 'block';
  aiResult.classList.add('hidden');

  try {
    if (!apiKey) throw new Error("API 키가 없습니다. 우측 하단 ⚙️ 설정에서 입력해주세요.");

    let finalModel = selectedModel;
    try {
      const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (listResp.ok) {
        const listData = await listResp.json();
        const availableModel = listData.models.find(m => 
          m.supportedGenerationMethods && 
          m.supportedGenerationMethods.includes("generateContent") &&
          m.name.includes("gemini")
        );
        if (availableModel) {
          finalModel = availableModel.name.replace('models/', '');
        }
      }
    } catch(e) {
      console.warn("모델 리스트 자동 조회 실패, 기존 설정된 모델로 강제 진행합니다.");
    }

    const prompt = `
당신은 고려대학교 학생들의 수강 신청을 돕는 유쾌한 학사 행정 AI 조교입니다.
아래 학생이 고민 중인 3가지 과목을 내부적으로는 완벽하게 무작위(랜덤)로 섞어서 1등부터 3등까지 순위를 매기되, 추천 이유는 짧게(1~2줄)만 적어주세요.

[학생 정보]
- 소속 학과: ${department}
- 이름: ${name}
- 바라는 점: ${expectations || "없음"}

[고민 중인 3가지 과목]
1. ${courses[0].name}
2. ${courses[1].name}
3. ${courses[2].name}

[엄격한 작성 규칙 - 반드시 지키세요]
1. 당신이 "무작위(랜덤)로 추천했다"는 사실이나 단어를 절대 겉으로 언급하지 마세요. 마치 치밀하게 분석해서 추천하는 것처럼 자연스럽게 작성하세요.
2. 글의 첫머리나 중간에 "학우님", "학생님", "${name}님" 등의 호칭을 절대 부르지 마시고, 인사말 없이 곧바로 1등 추천 내용부터 시작하세요.
3. 이유는 핵심만 아주 간략하게 작성하세요.
4. 가독성 좋게 마크다운으로 작성해주세요.
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      let errorMessage = `구글 API 서버 통신 오류 (상태 코드: ${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData.error && errorData.error.message) {
          errorMessage += `\n구글 응답 에러 원인: ${errorData.error.message}`;
        }
      } catch (err) {}
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    aiResult.innerHTML = `
      <h4 style="margin-top:0; color: #8B0029; font-size: 1.2rem; border-bottom: 2px solid #8B0029; padding-bottom: 10px;">🤖 실제 Google Gemini (${finalModel}) 수강 추천 결과</h4>
      <div style="white-space: pre-wrap;">${formattedText}</div>
    `;
  } catch (error) {
    console.error(error);
    aiResult.innerHTML = `
      <strong style="color:red;">⚠️ 구글 Gemini 통신 오류:</strong><br><br>
      ${error.message}<br><br>
      💡 확인해주세요: 입력하신 구글 API 키가 유효하지 않거나, 계정에 문제가 있을 수 있습니다.
    `;
  } finally {
    aiLoading.style.display = 'none';
    aiResult.classList.remove('hidden');
  }
});

// 새로운 설문 작성하기
resetBtn.addEventListener('click', () => {
  form.reset();
  step4.classList.add('hidden');
  aiResult.classList.add('hidden');
  aiLoading.style.display = 'none';
  mainHeader.style.display = 'block';
  form.style.display = 'block';
  step1.classList.remove('hidden');
});
