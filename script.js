/**
 * 우리 반 1인 1역할 배정기 (script.js)
 * - 12명 기본 학생 및 역할 1:1 매칭
 * - 공정한 Fisher-Yates 무작위 셔플 & 롤링 애니메이션
 * - 캔버스 콘페티 축하 효과
 * - 교실 게시판용 A4 인쇄
 * - 구글 스프레드시트(Apps Script) 양방향 연동 대비 모달 & API
 * - LocalStorage 자동 저장 및 간편 명단 관리
 */

(function () {
  'use strict';

  // 1. 기본 예시 데이터 (초등학생 12명 및 12개 1인 1역할)
  const DEFAULT_STUDENTS = [
    "김민준", "이서아", "박도윤", "최지우",
    "정예준", "강하은", "윤지호", "조수아",
    "임은우", "한지아", "오서준", "서채원"
  ];

  const DEFAULT_ROLES = [
    { id: 1, name: "칠판 도우미", emoji: "🧹", desc: "수업 후 칠판과 분필받이를 깨끗이 정리해요", color: "mint", category: "교실환경" },
    { id: 2, name: "우유·급식 도우미", emoji: "🥛", desc: "우유 배분과 급식 줄서기를 친절하게 도와요", color: "sky", category: "생활안전" },
    { id: 3, name: "에너지 지킴이", emoji: "💡", desc: "쉬는 시간 조명 끄기 및 교실 전자기기를 살펴요", color: "yellow", category: "환경보호" },
    { id: 4, name: "바른 줄서기 반장", emoji: "🚶", desc: "이동 수업 갈 때 두 줄로 바르게 서도록 이끌어요", color: "peach", category: "질서지킴" },
    { id: 5, name: "창문 환기 대장", emoji: "🪟", desc: "쉬는 시간마다 맑은 공기로 교실 창문을 환기해요", color: "lavender", category: "건강위생" },
    { id: 6, name: "도서 정리 도우미", emoji: "📚", desc: "학급 문고 책을 바르게 꽂고 깔끔히 정돈해요", color: "rose", category: "학습도움" },
    { id: 7, name: "시간표 알리미", emoji: "⏰", desc: "다음 시간 교과목과 필요한 준비물을 미리 적어요", color: "sky", category: "학습도움" },
    { id: 8, name: "분리수거 지킴이", emoji: "♻️", desc: "재활용 쓰레기가 바르게 분리수거되도록 살펴요", color: "green", category: "환경보호" },
    { id: 9, name: "반려식물 사랑이", emoji: "🌱", desc: "학급 화분에 정성껏 물을 주고 보살펴요", color: "mint", category: "교실환경" },
    { id: 10, name: "체육 교구 관리자", emoji: "⚽", desc: "체육 활동 공과 교구를 안전하게 챙겨와요", color: "peach", category: "체육활동" },
    { id: 11, name: "보건 안심이", emoji: "🩹", desc: "아픈 친구를 따뜻하게 배려하고 보건실을 안내해요", color: "rose", category: "건강위생" },
    { id: 12, name: "알림장·우편 도우미", emoji: "📬", desc: "가정통신문과 배부 학습지를 친구들에게 전달해요", color: "lavender", category: "학급도움" }
  ];

  // 학생별 귀여운 동물/표정 아바타 이모지 매핑 풀
  const AVATAR_EMOJIS = ["👦", "👧", "🐣", "🐻", "🐰", "🦁", "🐶", "🐱", "🐼", "🦊", "🐨", "🐯"];

  // 2. 앱 전역 상태
  const state = {
    className: "3학년 2반",
    assignedDate: "",
    students: [...DEFAULT_STUDENTS],
    roles: JSON.parse(JSON.stringify(DEFAULT_ROLES)),
    assignments: [], // [{ student, role, avatar }]
    appsScriptUrl: "",
    isShuffling: false
  };

  // 3. 로컬 스토리지 키
  const STORAGE_KEYS = {
    CLASS_INFO: "role_picker_class_info",
    STUDENTS: "role_picker_students",
    ROLES: "role_picker_roles",
    ASSIGNMENTS: "role_picker_assignments",
    APPS_SCRIPT_URL: "role_picker_apps_script_url"
  };

  // 4. DOM 요소 캐싱
  let elements = {};

  // 초기화 진입점
  document.addEventListener("DOMContentLoaded", initApp);

  function initApp() {
    cacheDomElements();
    loadFromLocalStorage();
    setupEventListeners();
    updateDashboardStats();
    renderCards();
    updatePrintBoardHeader();
  }

  function cacheDomElements() {
    elements = {
      classNameDisplay: document.getElementById("class-name-display"),
      assignedDateDisplay: document.getElementById("assigned-date-display"),
      totalStudentsCount: document.getElementById("total-students-count"),
      totalRolesCount: document.getElementById("total-roles-count"),
      assignStatusBadge: document.getElementById("assign-status-badge"),
      cardsGrid: document.getElementById("cards-grid"),
      
      // 주요 버튼
      btnAssign: document.getElementById("btn-assign"),
      btnReshuffle: document.getElementById("btn-reshuffle"),
      btnReset: document.getElementById("btn-reset"),
      btnCopyText: document.getElementById("btn-copy-text"),
      btnPrint: document.getElementById("btn-print"),
      btnManageModal: document.getElementById("btn-manage-modal"),
      btnSheetLoad: document.getElementById("btn-sheet-load"),
      btnSheetSave: document.getElementById("btn-sheet-save"),

      // 인쇄 영역
      printTitle: document.getElementById("print-board-title"),
      printMetaDate: document.getElementById("print-meta-date"),
      printMetaCount: document.getElementById("print-meta-count"),

      // 관리 모달
      manageModal: document.getElementById("manage-modal"),
      btnCloseManageModal: document.getElementById("btn-close-manage-modal"),
      btnSaveManage: document.getElementById("btn-save-manage"),
      btnResetDefaultManage: document.getElementById("btn-reset-default-manage"),
      inputClassName: document.getElementById("input-class-name"),
      textareaStudents: document.getElementById("textarea-students"),
      textareaRoles: document.getElementById("textarea-roles"),
      tabStudentsBtn: document.getElementById("tab-students-btn"),
      tabRolesBtn: document.getElementById("tab-roles-btn"),
      tabStudentsContent: document.getElementById("tab-students-content"),
      tabRolesContent: document.getElementById("tab-roles-content"),
      studentsCountBadge: document.getElementById("students-count-badge"),
      rolesCountBadge: document.getElementById("roles-count-badge"),

      // 스프레드시트 모달
      sheetModal: document.getElementById("sheet-modal"),
      btnCloseSheetModal: document.getElementById("btn-close-sheet-modal"),
      inputAppsScriptUrl: document.getElementById("input-apps-script-url"),
      btnSaveSheetUrl: document.getElementById("btn-save-sheet-url"),
      btnTestSheetFetch: document.getElementById("btn-test-sheet-fetch"),
      btnTestSheetSend: document.getElementById("btn-test-sheet-send"),
      btnCopyScriptCode: document.getElementById("btn-copy-script-code"),
      sheetStatusNotice: document.getElementById("sheet-status-notice"),

      // 토스트 및 캔버스
      toast: document.getElementById("toast-notice"),
      confettiCanvas: document.getElementById("confetti-canvas")
    };
  }

  // --------------------------------------------------------------------------
  // 로컬 스토리지 관리
  // --------------------------------------------------------------------------
  function loadFromLocalStorage() {
    try {
      const savedClass = localStorage.getItem(STORAGE_KEYS.CLASS_INFO);
      if (savedClass) {
        const parsed = JSON.parse(savedClass);
        state.className = parsed.className || "3학년 2반";
        state.assignedDate = parsed.assignedDate || "";
      }

      const savedStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (savedStudents) {
        state.students = JSON.parse(savedStudents);
      }

      const savedRoles = localStorage.getItem(STORAGE_KEYS.ROLES);
      if (savedRoles) {
        state.roles = JSON.parse(savedRoles);
      }

      const savedAssignments = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
      if (savedAssignments) {
        state.assignments = JSON.parse(savedAssignments);
      }

      const savedUrl = localStorage.getItem(STORAGE_KEYS.APPS_SCRIPT_URL);
      if (savedUrl) {
        state.appsScriptUrl = savedUrl;
      }
    } catch (e) {
      console.warn("로컬 저장소 로딩 중 오류:", e);
    }
  }

  function saveStateToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.CLASS_INFO, JSON.stringify({
        className: state.className,
        assignedDate: state.assignedDate
      }));
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(state.students));
      localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(state.roles));
      localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(state.assignments));
      localStorage.setItem(STORAGE_KEYS.APPS_SCRIPT_URL, state.appsScriptUrl);
    } catch (e) {
      console.warn("로컬 저장소 저장 실패:", e);
    }
  }

  // --------------------------------------------------------------------------
  // 이벤트 리스너 등록
  // --------------------------------------------------------------------------
  function setupEventListeners() {
    // 🎲 1인 1역할 배정하기 버튼
    elements.btnAssign?.addEventListener("click", () => {
      runRoleAssignment(true);
    });

    // 🔀 무작위 다시 섞기
    elements.btnReshuffle?.addEventListener("click", () => {
      runRoleAssignment(false);
    });

    // 🔄 초기화 버튼
    elements.btnReset?.addEventListener("click", () => {
      if (state.assignments.length === 0) {
        showToast("이미 대기 상태예요 ✨");
        return;
      }
      if (confirm("배정된 결과를 초기화하시겠어요?")) {
        state.assignments = [];
        state.assignedDate = "";
        saveStateToLocalStorage();
        updateDashboardStats();
        renderCards();
        updatePrintBoardHeader();
        showToast("배정 결과가 초기화되었습니다.");
      }
    });

    // 🖨️ A4 게시판 인쇄 버튼
    elements.btnPrint?.addEventListener("click", () => {
      if (state.assignments.length === 0) {
        if (!confirm("아직 역할 배정이 되지 않았습니다. 빈 양식으로 인쇄하시겠어요?")) {
          return;
        }
      }
      updatePrintBoardHeader();
      window.print();
    });

    // 📋 결과 텍스트 복사 버튼
    elements.btnCopyText?.addEventListener("click", copyResultsToClipboard);

    // 학급 정보 pill 클릭 시 간편 변경
    elements.classNameDisplay?.addEventListener("click", promptClassNameChange);

    // [⚙️ 명단 및 역할 관리 모달] 열기/닫기
    elements.btnManageModal?.addEventListener("click", openManageModal);
    elements.btnCloseManageModal?.addEventListener("click", closeManageModal);
    elements.btnSaveManage?.addEventListener("click", saveManageSettings);
    elements.btnResetDefaultManage?.addEventListener("click", resetToDefaultManage);

    // 탭 전환
    elements.tabStudentsBtn?.addEventListener("click", () => switchManageTab("students"));
    elements.tabRolesBtn?.addEventListener("click", () => switchManageTab("roles"));

    // 텍스트 실시간 카운트
    elements.textareaStudents?.addEventListener("input", updateManageCounts);
    elements.textareaRoles?.addEventListener("input", updateManageCounts);

    // [🔄 시트 불러오기] / [💾 시트에 결과 저장] 상단 버튼
    elements.btnSheetLoad?.addEventListener("click", () => {
      openSheetModal("load");
    });
    elements.btnSheetSave?.addEventListener("click", () => {
      openSheetModal("save");
    });

    // 스프레드시트 모달 닫기
    elements.btnCloseSheetModal?.addEventListener("click", closeSheetModal);
    elements.btnSaveSheetUrl?.addEventListener("click", saveSheetUrlFromModal);
    elements.btnTestSheetFetch?.addEventListener("click", executeSheetLoad);
    elements.btnTestSheetSend?.addEventListener("click", executeSheetSave);
    elements.btnCopyScriptCode?.addEventListener("click", copyAppsScriptCode);

    // 모달 배경 클릭 시 닫기
    window.addEventListener("click", (e) => {
      if (e.target === elements.manageModal) closeManageModal();
      if (e.target === elements.sheetModal) closeSheetModal();
    });
  }

  // --------------------------------------------------------------------------
  // 핵심 로직: 1인 1역할 무작위 배정 (Fisher-Yates 셔플)
  // --------------------------------------------------------------------------
  function runRoleAssignment(withAnimation = true) {
    if (state.isShuffling) return;

    if (state.students.length === 0) {
      alert("배정할 학생 명단이 비어 있습니다. [명단 설정]에서 학생 이름을 입력해 주세요.");
      openManageModal();
      return;
    }

    if (state.roles.length === 0) {
      alert("배정할 학급 역할이 비어 있습니다. [명단 설정]에서 역할을 입력해 주세요.");
      openManageModal();
      return;
    }

    state.isShuffling = true;

    // 현재 날짜 세팅 (예: 2026. 10. 17.)
    const now = new Date();
    const formattedDate = `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(2, '0')}`;
    state.assignedDate = formattedDate;

    // 학생 명단 복사 후 무작위 셔플 (Fisher-Yates)
    const shuffledStudents = [...state.students];
    for (let i = shuffledStudents.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledStudents[i], shuffledStudents[j]] = [shuffledStudents[j], shuffledStudents[i]];
    }

    // 아바타 무작위 셔플
    const shuffledAvatars = [...AVATAR_EMOJIS].sort(() => Math.random() - 0.5);

    // 역할과 1:1 매칭
    const newAssignments = [];
    const count = Math.max(state.roles.length, shuffledStudents.length);

    for (let idx = 0; idx < count; idx++) {
      const role = state.roles[idx] || {
        id: idx + 1,
        name: `자율 도우미 ${idx + 1}`,
        emoji: "⭐",
        desc: "교실 속 필요한 곳에서 스스로 돕기",
        color: "yellow",
        category: "자율활동"
      };

      const studentName = shuffledStudents[idx] || "선생님 도움";
      const avatar = shuffledAvatars[idx % shuffledAvatars.length];

      newAssignments.push({
        index: idx + 1,
        student: studentName,
        role: role,
        avatar: avatar
      });
    }

    if (withAnimation) {
      // 롤링 애니메이션 효과
      document.body.classList.add("shuffling");
      elements.cardsGrid.style.opacity = "0.7";

      let rollCount = 0;
      const maxRolls = 6;
      const interval = setInterval(() => {
        rollCount++;
        // 임시 롤링 텍스트
        const tempStudentNames = [...state.students].sort(() => Math.random() - 0.5);
        renderTemporaryRolling(tempStudentNames);

        if (rollCount >= maxRolls) {
          clearInterval(interval);
          document.body.classList.remove("shuffling");
          elements.cardsGrid.style.opacity = "1";

          // 최종 확정 배정 반영
          state.assignments = newAssignments;
          saveStateToLocalStorage();
          updateDashboardStats();
          renderCards(true);
          updatePrintBoardHeader();
          state.isShuffling = false;

          // 축하 콘페티 파티클
          launchConfetti();
          showToast(`🎉 ${state.assignments.length}명의 역할 배정이 완료되었어요!`);
        }
      }, 100);
    } else {
      state.assignments = newAssignments;
      saveStateToLocalStorage();
      updateDashboardStats();
      renderCards(false);
      updatePrintBoardHeader();
      state.isShuffling = false;
      showToast("새로운 순서로 다시 배정되었습니다 🎲");
    }
  }

  // 롤링 중 임시 화면
  function renderTemporaryRolling(tempNames) {
    const cards = elements.cardsGrid.querySelectorAll(".role-card");
    cards.forEach((card, i) => {
      const nameEl = card.querySelector(".student-name");
      if (nameEl && tempNames[i % tempNames.length]) {
        nameEl.textContent = tempNames[i % tempNames.length];
        nameEl.style.color = "#ff7e54";
      }
    });
  }

  // --------------------------------------------------------------------------
  // 카드 그리드 렌더링
  // --------------------------------------------------------------------------
  function renderCards(animatePop = false) {
    if (!elements.cardsGrid) return;
    elements.cardsGrid.innerHTML = "";

    const isAssigned = state.assignments.length > 0;
    const itemsToRender = isAssigned ? state.assignments : state.roles.map((r, i) => ({
      index: i + 1,
      student: null,
      role: r,
      avatar: "👤"
    }));

    itemsToRender.forEach((item, idx) => {
      const card = document.createElement("div");
      card.className = `role-card ${animatePop ? 'just-assigned' : ''}`;
      if (animatePop) {
        card.style.animationDelay = `${idx * 0.04}s`;
      }

      const roleColor = item.role.color || "mint";
      const hasStudent = Boolean(item.student);

      card.innerHTML = `
        <div class="card-header-line">
          <span class="card-num-badge">역할 #${item.index || idx + 1}</span>
          <span class="card-category-tag">${escapeHtml(item.role.category || '1인 1역할')}</span>
        </div>

        <div class="role-highlight-box theme-${roleColor}">
          <div class="role-emoji-large">${item.role.emoji || '🌱'}</div>
          <div class="role-name-text font-jua">${escapeHtml(item.role.name)}</div>
          <div class="role-desc-text">${escapeHtml(item.role.desc || '')}</div>
        </div>

        <div class="assigned-student-box ${hasStudent ? 'filled' : ''}">
          <div class="student-identity">
            <div class="student-avatar">${item.avatar || '👦'}</div>
            <div class="student-meta">
              <span class="prefix">담당 학생</span>
              <span class="student-name font-jua">
                ${hasStudent ? escapeHtml(item.student) : '<span class="empty-placeholder">배정 대기 중...</span>'}
              </span>
            </div>
          </div>
          ${hasStudent ? `
            <button class="btn-card-swap" title="다른 친구와 바꾸기" data-index="${idx}">
              ⇄
            </button>
          ` : ''}
        </div>
      `;

      // 개별 친구 스왑 버튼
      const swapBtn = card.querySelector(".btn-card-swap");
      if (swapBtn) {
        swapBtn.addEventListener("click", () => handleSingleCardSwap(idx));
      }

      elements.cardsGrid.appendChild(card);
    });
  }

  // 특정 학생 임의 변경/스왑
  function handleSingleCardSwap(targetIndex) {
    const currentStudent = state.assignments[targetIndex]?.student;
    const availableStudents = state.students;

    const newName = prompt(
      `[${state.assignments[targetIndex]?.role.name}]의 담당 학생을 직접 변경합니다.\n현재 담당: ${currentStudent}\n새로 배정할 학생 이름을 입력해 주세요:`,
      currentStudent
    );

    if (newName && newName.trim()) {
      state.assignments[targetIndex].student = newName.trim();
      saveStateToLocalStorage();
      renderCards();
      showToast(`${newName.trim()} 학생으로 변경되었어요.`);
    }
  }

  // --------------------------------------------------------------------------
  // 상단 대시보드 상태 갱신
  // --------------------------------------------------------------------------
  function updateDashboardStats() {
    if (elements.classNameDisplay) {
      elements.classNameDisplay.textContent = state.className;
    }

    if (elements.assignedDateDisplay) {
      elements.assignedDateDisplay.textContent = state.assignedDate 
        ? `배정일: ${state.assignedDate}` 
        : "아직 배정되지 않음";
    }

    if (elements.totalStudentsCount) {
      elements.totalStudentsCount.textContent = `${state.students.length}명`;
    }

    if (elements.totalRolesCount) {
      elements.totalRolesCount.textContent = `${state.roles.length}개`;
    }

    if (elements.assignStatusBadge) {
      const isComplete = state.assignments.length > 0;
      elements.assignStatusBadge.className = `badge-tag ${isComplete ? 'badge-complete' : 'badge-ready'}`;
      elements.assignStatusBadge.textContent = isComplete 
        ? `배정 완료 (${state.assignments.length}명)` 
        : "배정 대기중";
    }
  }

  function updatePrintBoardHeader() {
    if (elements.printTitle) {
      elements.printTitle.textContent = `🏫 ${state.className} 1인 1역할 게시판`;
    }
    if (elements.printMetaDate) {
      elements.printMetaDate.textContent = state.assignedDate ? `배정일자: ${state.assignedDate}` : `작성일: ${new Date().toLocaleDateString('ko-KR')}`;
    }
    if (elements.printMetaCount) {
      elements.printMetaCount.textContent = `학생 총원: ${state.students.length}명 | 학급 역할: ${state.roles.length}개`;
    }
  }

  function promptClassNameChange() {
    const nextName = prompt("우리 반 학급명을 입력해 주세요 (예: 3학년 2반, 햇살반):", state.className);
    if (nextName && nextName.trim()) {
      state.className = nextName.trim();
      saveStateToLocalStorage();
      updateDashboardStats();
      updatePrintBoardHeader();
      showToast(`학급명이 '${state.className}'(으)로 변경되었습니다.`);
    }
  }

  // --------------------------------------------------------------------------
  // 결과 텍스트 클립보드 복사
  // --------------------------------------------------------------------------
  function copyResultsToClipboard() {
    if (state.assignments.length === 0) {
      showToast("먼저 [🎲 역할 배정하기]를 눌러 배정을 완료해 주세요!");
      return;
    }

    let message = `📋 [${state.className} 1인 1역할 배정 결과]\n`;
    message += `📅 배정일: ${state.assignedDate || '미정'}\n\n`;

    state.assignments.forEach((item, i) => {
      message += `${i + 1}. ${item.student}: ${item.role.name} ${item.role.emoji} (${item.role.desc})\n`;
    });

    message += `\n🌱 우리 모두 맡은 역할을 책임감 있게 실천해요! ✨`;

    navigator.clipboard.writeText(message).then(() => {
      showToast("📋 배정 결과가 클립보드에 복사되었어요! (알림장/메신저에 붙여넣기)");
    }).catch(() => {
      // 대체 복사
      const tempArea = document.createElement("textarea");
      tempArea.value = message;
      document.body.appendChild(tempArea);
      tempArea.select();
      document.execCommand("copy");
      document.body.removeChild(tempArea);
      showToast("📋 배정 결과가 복사되었습니다!");
    });
  }

  // --------------------------------------------------------------------------
  // 모달 1: 학생 명단 및 역할 관리
  // --------------------------------------------------------------------------
  function openManageModal() {
    if (!elements.manageModal) return;
    elements.inputClassName.value = state.className;
    elements.textareaStudents.value = state.students.join("\n");
    elements.textareaRoles.value = state.roles.map(r => `${r.name} | ${r.desc} | ${r.emoji}`).join("\n");

    updateManageCounts();
    switchManageTab("students");
    elements.manageModal.classList.add("active");
  }

  function closeManageModal() {
    elements.manageModal?.classList.remove("active");
  }

  function switchManageTab(tabName) {
    if (tabName === "students") {
      elements.tabStudentsBtn?.classList.add("active");
      elements.tabRolesBtn?.classList.remove("active");
      elements.tabStudentsContent.style.display = "block";
      elements.tabRolesContent.style.display = "none";
    } else {
      elements.tabRolesBtn?.classList.add("active");
      elements.tabStudentsBtn?.classList.remove("active");
      elements.tabStudentsContent.style.display = "none";
      elements.tabRolesContent.style.display = "block";
    }
  }

  function updateManageCounts() {
    const rawStudents = elements.textareaStudents?.value || "";
    const studentLines = rawStudents.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (elements.studentsCountBadge) {
      elements.studentsCountBadge.textContent = `${studentLines.length}명`;
    }

    const rawRoles = elements.textareaRoles?.value || "";
    const roleLines = rawRoles.split("\n").map(s => s.trim()).filter(Boolean);
    if (elements.rolesCountBadge) {
      elements.rolesCountBadge.textContent = `${roleLines.length}개`;
    }
  }

  function saveManageSettings() {
    const newClass = elements.inputClassName.value.trim() || "3학년 2반";
    state.className = newClass;

    // 학생 명단 파싱
    const rawStudents = elements.textareaStudents.value;
    const studentList = rawStudents.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (studentList.length === 0) {
      alert("적어도 1명 이상의 학생 이름을 입력해 주세요.");
      return;
    }
    state.students = studentList;

    // 역할 파싱
    const rawRoles = elements.textareaRoles.value;
    const roleLines = rawRoles.split("\n").map(s => s.trim()).filter(Boolean);
    if (roleLines.length === 0) {
      alert("적어도 1개 이상의 역할을 입력해 주세요.");
      return;
    }

    const colorPalettes = ["mint", "sky", "yellow", "peach", "lavender", "rose", "green"];
    state.roles = roleLines.map((line, idx) => {
      const parts = line.split("|").map(p => p.trim());
      const name = parts[0] || `역할 ${idx + 1}`;
      const desc = parts[1] || "학급을 위해 성실히 실천해요";
      const emoji = parts[2] || "🌱";
      return {
        id: idx + 1,
        name: name,
        desc: desc,
        emoji: emoji,
        color: colorPalettes[idx % colorPalettes.length],
        category: "학급역할"
      };
    });

    saveStateToLocalStorage();
    updateDashboardStats();
    renderCards();
    updatePrintBoardHeader();
    closeManageModal();
    showToast("학생 명단과 역할 목록이 저장되었어요 ✨");
  }

  function resetToDefaultManage() {
    if (confirm("기본 12명 학생 및 12개 역할 데이터로 되돌리시겠습니까?")) {
      elements.inputClassName.value = "3학년 2반";
      elements.textareaStudents.value = DEFAULT_STUDENTS.join("\n");
      elements.textareaRoles.value = DEFAULT_ROLES.map(r => `${r.name} | ${r.desc} | ${r.emoji}`).join("\n");
      updateManageCounts();
    }
  }

  // --------------------------------------------------------------------------
  // 모달 2: 구글 스프레드시트(Apps Script) 양방향 연동
  // --------------------------------------------------------------------------
  function openSheetModal(mode = "load") {
    if (!elements.sheetModal) return;
    if (elements.inputAppsScriptUrl) {
      elements.inputAppsScriptUrl.value = state.appsScriptUrl || "";
    }
    elements.sheetModal.classList.add("active");

    if (elements.sheetStatusNotice) {
      elements.sheetStatusNotice.textContent = state.appsScriptUrl
        ? "연동 URL이 등록되어 있습니다. 아래 버튼을 눌러 테스트해보세요."
        : "💡 다음 단계에서 Apps Script 웹 앱 배포 URL을 여기에 입력하여 간편하게 시트와 실시간 연동할 수 있습니다.";
    }
  }

  function closeSheetModal() {
    elements.sheetModal?.classList.remove("active");
  }

  function saveSheetUrlFromModal() {
    const url = elements.inputAppsScriptUrl.value.trim();
    state.appsScriptUrl = url;
    saveStateToLocalStorage();
    showToast("스프레드시트 연동 URL이 저장되었습니다.");
  }

  // 시트 불러오기 실행 (Apps Script Web App)
  async function executeSheetLoad() {
    const url = elements.inputAppsScriptUrl.value.trim();
    if (!url) {
      alert("구글 Apps Script 배포 URL을 입력해 주세요.\n(미입력 시 아래의 기본 예시 데이터로 모의 로드 테스트를 진행할 수 있습니다)");
      if (confirm("연동 URL 없이 기본 12명 데이터로 리셋 테스트를 진행할까요?")) {
        state.students = [...DEFAULT_STUDENTS];
        state.roles = JSON.parse(JSON.stringify(DEFAULT_ROLES));
        saveStateToLocalStorage();
        updateDashboardStats();
        renderCards();
        closeSheetModal();
        showToast("🔄 기본 12명 명단과 역할 데이터를 불러왔습니다.");
      }
      return;
    }

    try {
      showToast("🔄 구글 시트에서 명단을 가져오는 중...");
      const response = await fetch(`${url}?action=getData`, {
        method: "GET",
        mode: "cors"
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.students && Array.isArray(data.students)) {
        state.students = data.students;
      }
      if (data.roles && Array.isArray(data.roles)) {
        state.roles = data.roles;
      }
      if (data.className) {
        state.className = data.className;
      }

      state.appsScriptUrl = url;
      saveStateToLocalStorage();
      updateDashboardStats();
      renderCards();
      updatePrintBoardHeader();
      closeSheetModal();
      showToast("✅ 구글 스프레드시트에서 데이터를 성공적으로 불러왔습니다!");
    } catch (err) {
      console.error(err);
      alert(`시트 불러오기 중 오류가 발생했습니다:\n${err.message}\n\n* Apps Script 웹 앱 배포 시 '액세스 권한: 모든 사용자(Anyone)'로 설정되었는지 확인해 주세요.`);
    }
  }

  // 시트에 결과 저장 실행 (Apps Script Web App)
  async function executeSheetSave() {
    if (state.assignments.length === 0) {
      alert("저장할 배정 결과가 없습니다. 먼저 [🎲 역할 배정하기]를 진행해 주세요.");
      return;
    }

    const url = elements.inputAppsScriptUrl.value.trim();
    if (!url) {
      alert("구글 Apps Script 배포 URL을 입력해 주세요.\n(URL을 입력하면 구글 시트에 자동으로 저장 행이 기록됩니다.)");
      return;
    }

    try {
      showToast("💾 구글 시트에 배정 결과를 저장하는 중...");
      const payload = {
        action: "saveAssignments",
        className: state.className,
        assignedDate: state.assignedDate,
        assignments: state.assignments.map(a => ({
          student: a.student,
          roleName: a.role.name,
          roleEmoji: a.role.emoji,
          roleDesc: a.role.desc
        }))
      };

      const response = await fetch(url, {
        method: "POST",
        mode: "no-cors", // Google Apps Script CORS 우회 표준 모드
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      state.appsScriptUrl = url;
      saveStateToLocalStorage();
      closeSheetModal();
      showToast("✅ 구글 스프레드시트에 배정 결과 저장을 요청했습니다!");
    } catch (err) {
      console.error(err);
      alert(`시트 저장 중 오류가 발생했습니다: ${err.message}`);
    }
  }

  // 선생님용 추천 Apps Script 템플릿 코드 복사
  function copyAppsScriptCode() {
    const code = `/**
 * [우리 반 1인 1역할 배정기 Google Apps Script 연동 코드]
 * 1. 구글 스프레드시트 메뉴 > 확장 프로그램 > Apps Script 클릭
 * 2. 기존 코드를 지우고 본 코드를 붙여넣기 후 저장 (Ctrl+S)
 * 3. 오른쪽 상단 [배포] > [새 배포] > [웹 앱] 선택
 * 4. '액세스 권한이 있는 사용자'를 '모든 사용자(Anyone)'로 지정 후 배포!
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var studentSheet = ss.getSheetByName("학생명단") || ss.getSheets()[0];
  var roleSheet = ss.getSheetByName("역할목록");

  var students = [];
  var sData = studentSheet.getDataRange().getValues();
  for (var i = 1; i < sData.length; i++) {
    if (sData[i][0]) students.push(String(sData[i][0]).trim());
  }

  var roles = [];
  if (roleSheet) {
    var rData = roleSheet.getDataRange().getValues();
    for (var j = 1; j < rData.length; j++) {
      if (rData[j][0]) {
        roles.push({
          id: j,
          name: String(rData[j][0]),
          desc: rData[j][1] || "",
          emoji: rData[j][2] || "🌱",
          color: "mint"
        });
      }
    }
  }

  var result = {
    className: "3학년 2반",
    students: students.length > 0 ? students : undefined,
    roles: roles.length > 0 ? roles : undefined
  };

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var postData = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var resultSheet = ss.getSheetByName("배정결과");
  if (!resultSheet) {
    resultSheet = ss.insertSheet("배정결과");
    resultSheet.appendRow(["배정일시", "학급명", "번호", "학생이름", "역할명", "역할설명"]);
  }

  var list = postData.assignments || [];
  var now = new Date();
  list.forEach(function(item, idx) {
    resultSheet.appendRow([now, postData.className, idx + 1, item.student, item.roleName, item.roleDesc]);
  });

  return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

    navigator.clipboard.writeText(code).then(() => {
      showToast("📋 Apps Script 템플릿 코드가 복사되었어요!");
    });
  }

  // --------------------------------------------------------------------------
  // 아기자기한 축하 콘페티(색종이) 파티클 애니메이션
  // --------------------------------------------------------------------------
  function launchConfetti() {
    const canvas = elements.confettiCanvas;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width = window.innerWidth;
    const height = canvas.height = window.innerHeight;

    const colors = ["#ff9f7d", "#ffd37e", "#38d9a9", "#4dabf7", "#9775fa", "#f06595"];
    const particles = [];
    const particleCount = 75;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: width * 0.5 + (Math.random() - 0.5) * 200,
        y: height * 0.4 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.8) * 15,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRotation: (Math.random() - 0.5) * 10,
        life: 1,
        decay: Math.random() * 0.015 + 0.01
      });
    }

    let animationId;
    function renderFrame() {
      ctx.clearRect(0, 0, width, height);

      let aliveCount = 0;
      particles.forEach(p => {
        if (p.life > 0) {
          aliveCount++;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.35; // 중력 가속도
          p.rotation += p.vRotation;
          p.life -= p.decay;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });

      if (aliveCount > 0) {
        animationId = requestAnimationFrame(renderFrame);
      } else {
        ctx.clearRect(0, 0, width, height);
        cancelAnimationFrame(animationId);
      }
    }

    renderFrame();
  }

  // --------------------------------------------------------------------------
  // 토스트 메시지 안내
  // --------------------------------------------------------------------------
  let toastTimer = null;
  function showToast(message) {
    if (!elements.toast) return;
    elements.toast.textContent = message;
    elements.toast.classList.add("show");

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      elements.toast.classList.remove("show");
    }, 3200);
  }

  // HTML XSS 방지 이스케이프
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

})();
