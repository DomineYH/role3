/**
 * 우리 반 1인 1역할 배정기 (script.js) - NAVER 포털 스타일
 * - 네이버 시그니처 디자인 시스템 및 실시간 검색/카테고리 필터링
 * - 12명 기본 학생 및 역할 1:1 무작위 배정 (Fisher-Yates)
 * - 캔버스 콘페티 축하 효과 & 롤링 애니메이션
 * - 교실 게시판용 깔끔한 A4 인쇄
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
    { id: 4, name: "바른 줄서기 반장", emoji: "🚶", desc: "이동 수업 갈 때 두 줄로 바르게 서도록 이끌어요", color: "peach", category: "생활안전" },
    { id: 5, name: "창문 환기 대장", emoji: "🪟", desc: "쉬는 시간마다 맑은 공기로 교실 창문을 환기해요", color: "lavender", category: "건강위생" },
    { id: 6, name: "도서 정리 도우미", emoji: "📚", desc: "학급 문고 책을 바르게 꽂고 깔끔히 정돈해요", color: "rose", category: "학습도움" },
    { id: 7, name: "시간표 알리미", emoji: "⏰", desc: "다음 시간 교과목과 필요한 준비물을 미리 적어요", color: "sky", category: "학습도움" },
    { id: 8, name: "분리수거 지킴이", emoji: "♻️", desc: "재활용 쓰레기가 바르게 분리수거되도록 살펴요", color: "green", category: "환경보호" },
    { id: 9, name: "반려식물 사랑이", emoji: "🌱", desc: "학급 화분에 정성껏 물을 주고 보살펴요", color: "mint", category: "교실환경" },
    { id: 10, name: "체육 교구 관리자", emoji: "⚽", desc: "체육 활동 공과 교구를 안전하게 챙겨와요", color: "peach", category: "생활안전" },
    { id: 11, name: "보건 안심이", emoji: "🩹", desc: "아픈 친구를 따뜻하게 배려하고 보건실을 안내해요", color: "rose", category: "건강위생" },
    { id: 12, name: "알림장·우편 도우미", emoji: "📬", desc: "가정통신문과 배부 학습지를 친구들에게 전달해요", color: "lavender", category: "학습도움" }
  ];

  const AVATAR_EMOJIS = ["👦", "👧", "🐣", "🐻", "🐰", "🦁", "🐶", "🐱", "🐼", "🦊", "🐨", "🐯"];

  // 2. 앱 전역 상태
  const state = {
    className: "3학년 2반",
    assignedDate: "",
    students: [...DEFAULT_STUDENTS],
    roles: JSON.parse(JSON.stringify(DEFAULT_ROLES)),
    assignments: [], // [{ student, role, avatar }]
    appsScriptUrl: "",
    isShuffling: false,
    searchQuery: "",
    selectedCategory: "ALL"
  };

  // 3. 로컬 스토리지 키
  const STORAGE_KEYS = {
    CLASS_INFO: "naver_role_picker_class_info",
    STUDENTS: "naver_role_picker_students",
    ROLES: "naver_role_picker_roles",
    ASSIGNMENTS: "naver_role_picker_assignments",
    APPS_SCRIPT_URL: "naver_role_picker_apps_script_url"
  };

  // 4. DOM 요소 캐싱
  let elements = {};

  document.addEventListener("DOMContentLoaded", initApp);

  function initApp() {
    cacheDomElements();
    loadFromLocalStorage();
    setupTodayDateDisplay();
    setupEventListeners();
    updateDashboardStats();
    renderCards();
    updatePrintBoardHeader();
  }

  function cacheDomElements() {
    elements = {
      // 상단 헤더 & 검색
      headerTodayDate: document.getElementById("header-today-date"),
      topClassName: document.getElementById("top-class-name"),
      searchInput: document.getElementById("nv-search-input"),
      btnSearchTrigger: document.getElementById("btn-search-trigger"),
      logoRefresh: document.getElementById("logo-refresh"),
      gnbHome: document.getElementById("gnb-home"),

      // 상단 GNB 버튼
      btnSheetLoad: document.getElementById("btn-sheet-load"),
      btnSheetSave: document.getElementById("btn-sheet-save"),
      btnManageModal: document.getElementById("btn-manage-modal"),
      btnPrint: document.getElementById("btn-print"),
      btnCopyText: document.getElementById("btn-copy-text"),

      // 보드 영역
      boardCounter: document.getElementById("board-counter"),
      categoryTabsContainer: document.getElementById("category-tabs"),
      subStatusText: document.getElementById("sub-status-text"),
      searchFilterStatus: document.getElementById("search-filter-status"),
      cardsGrid: document.getElementById("cards-grid"),

      // 사이드바 컨트롤 박스
      classNameDisplay: document.getElementById("class-name-display"),
      btnEditClassName: document.getElementById("btn-edit-class-name"),
      assignStatusBadge: document.getElementById("assign-status-badge"),
      btnAssign: document.getElementById("btn-assign"),
      btnReshuffle: document.getElementById("btn-reshuffle"),
      btnCopyTextSide: document.getElementById("btn-copy-text-side"),
      btnReset: document.getElementById("btn-reset"),
      totalStudentsCount: document.getElementById("total-students-count"),
      totalRolesCount: document.getElementById("total-roles-count"),
      assignedDateDisplay: document.getElementById("assigned-date-display"),

      // 위젯 박스 버튼
      btnWidgetSheetLoad: document.getElementById("btn-widget-sheet-load"),
      btnWidgetSheetSave: document.getElementById("btn-widget-sheet-save"),
      btnBannerPrint: document.getElementById("btn-banner-print"),
      sheetSyncStatus: document.getElementById("sheet-sync-status"),

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

      // 푸터 링크
      footerLinkGuide: document.getElementById("footer-link-guide"),
      footerLinkSheet: document.getElementById("footer-link-sheet"),
      footerLinkManage: document.getElementById("footer-link-manage"),

      // 토스트 및 캔버스
      toast: document.getElementById("toast-notice"),
      confettiCanvas: document.getElementById("confetti-canvas")
    };
  }

  function setupTodayDateDisplay() {
    if (elements.headerTodayDate) {
      const days = ["일", "월", "화", "수", "목", "금", "토"];
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const date = String(now.getDate()).padStart(2, '0');
      const day = days[now.getDay()];
      elements.headerTodayDate.textContent = `📅 ${year}. ${month}. ${date}. (${day})`;
    }
  }

  // --------------------------------------------------------------------------
  // 로컬 스토리지 동기화
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
      console.warn("로컬 저장소 로딩 실패:", e);
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
    // 1. 네이버 실시간 검색바 필터링
    elements.searchInput?.addEventListener("input", (e) => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      renderCards();
    });

    elements.btnSearchTrigger?.addEventListener("click", () => {
      elements.searchInput?.focus();
    });

    elements.logoRefresh?.addEventListener("click", () => {
      state.searchQuery = "";
      state.selectedCategory = "ALL";
      if (elements.searchInput) elements.searchInput.value = "";
      updateCategoryTabsUI();
      renderCards();
      showToast("네이버 학급 홈으로 이동했습니다.");
    });

    elements.gnbHome?.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // 2. 카테고리 탭 클릭 필터
    const catTabs = elements.categoryTabsContainer?.querySelectorAll(".nv-cat-tab");
    catTabs?.forEach(tab => {
      tab.addEventListener("click", () => {
        state.selectedCategory = tab.getAttribute("data-category") || "ALL";
        updateCategoryTabsUI();
        renderCards();
      });
    });

    // 3. 메인 배정 및 재셔플 버튼
    elements.btnAssign?.addEventListener("click", () => runRoleAssignment(true));
    elements.btnReshuffle?.addEventListener("click", () => runRoleAssignment(false));

    // 4. 초기화 버튼
    elements.btnReset?.addEventListener("click", () => {
      if (state.assignments.length === 0) {
        showToast("이미 대기 상태입니다.");
        return;
      }
      if (confirm("배정된 결과를 초기화하시겠습니까?")) {
        state.assignments = [];
        state.assignedDate = "";
        saveStateToLocalStorage();
        updateDashboardStats();
        renderCards();
        updatePrintBoardHeader();
        showToast("배정 결과가 초기화되었습니다.");
      }
    });

    // 5. 인쇄 버튼 (상단 GNB 및 우측 배너)
    elements.btnPrint?.addEventListener("click", handlePrint);
    elements.btnBannerPrint?.addEventListener("click", handlePrint);

    // 6. 텍스트 복사 버튼 (GNB 및 사이드바)
    elements.btnCopyText?.addEventListener("click", copyResultsToClipboard);
    elements.btnCopyTextSide?.addEventListener("click", copyResultsToClipboard);

    // 7. 학급명 수정 버튼
    elements.btnEditClassName?.addEventListener("click", promptClassNameChange);
    elements.topClassName?.parentElement?.addEventListener("click", promptClassNameChange);

    // 8. 명단 및 역할 관리 모달
    elements.btnManageModal?.addEventListener("click", openManageModal);
    elements.footerLinkManage?.addEventListener("click", (e) => {
      e.preventDefault();
      openManageModal();
    });
    elements.btnCloseManageModal?.addEventListener("click", closeManageModal);
    elements.btnSaveManage?.addEventListener("click", saveManageSettings);
    elements.btnResetDefaultManage?.addEventListener("click", resetToDefaultManage);
    elements.tabStudentsBtn?.addEventListener("click", () => switchManageTab("students"));
    elements.tabRolesBtn?.addEventListener("click", () => switchManageTab("roles"));
    elements.textareaStudents?.addEventListener("input", updateManageCounts);
    elements.textareaRoles?.addEventListener("input", updateManageCounts);

    // 9. 구글 스프레드시트 모달
    elements.btnSheetLoad?.addEventListener("click", () => openSheetModal("load"));
    elements.btnSheetSave?.addEventListener("click", () => openSheetModal("save"));
    elements.btnWidgetSheetLoad?.addEventListener("click", () => openSheetModal("load"));
    elements.btnWidgetSheetSave?.addEventListener("click", () => openSheetModal("save"));
    elements.footerLinkSheet?.addEventListener("click", (e) => {
      e.preventDefault();
      openSheetModal("load");
    });
    elements.btnCloseSheetModal?.addEventListener("click", closeSheetModal);
    elements.btnSaveSheetUrl?.addEventListener("click", saveSheetUrlFromModal);
    elements.btnTestSheetFetch?.addEventListener("click", executeSheetLoad);
    elements.btnTestSheetSend?.addEventListener("click", executeSheetSave);
    elements.btnCopyScriptCode?.addEventListener("click", copyAppsScriptCode);

    // 10. 이용안내 링크
    elements.footerLinkGuide?.addEventListener("click", (e) => {
      e.preventDefault();
      alert("NAVER 스타일 학급 1인 1역할 배정기 이용 안내:\n1. [🎲 역할 배정하기] 버튼을 누르면 1:1로 랜덤 배정됩니다.\n2. 상단 네이버 검색창에서 학생 이름 또는 역할을 빠르게 찾을 수 있습니다.\n3. [🖨️ A4 인쇄]로 교실 게시판 부착용 출력물을 만드세요.\n4. [🔄 시트 불러오기]를 통해 구글 스프레드시트와 실시간 연동할 수 있습니다.");
    });

    // 배경 클릭 시 모달 닫기
    window.addEventListener("click", (e) => {
      if (e.target === elements.manageModal) closeManageModal();
      if (e.target === elements.sheetModal) closeSheetModal();
    });
  }

  function updateCategoryTabsUI() {
    const catTabs = elements.categoryTabsContainer?.querySelectorAll(".nv-cat-tab");
    catTabs?.forEach(tab => {
      if (tab.getAttribute("data-category") === state.selectedCategory) {
        tab.classList.add("active");
      } else {
        tab.classList.remove("active");
      }
    });
  }

  // --------------------------------------------------------------------------
  // 역할 배정 실행 (Fisher-Yates 알고리즘)
  // --------------------------------------------------------------------------
  function runRoleAssignment(withAnimation = true) {
    if (state.isShuffling) return;

    if (state.students.length === 0) {
      alert("학생 명단이 비어 있습니다. [명단·역할 관리]에서 등록해 주세요.");
      openManageModal();
      return;
    }

    if (state.roles.length === 0) {
      alert("역할 목록이 비어 있습니다. [명단·역할 관리]에서 등록해 주세요.");
      openManageModal();
      return;
    }

    state.isShuffling = true;

    // 날짜 기록
    const now = new Date();
    const formattedDate = `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(2, '0')}`;
    state.assignedDate = formattedDate;

    // 학생 명단 셔플
    const shuffledStudents = [...state.students];
    for (let i = shuffledStudents.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledStudents[i], shuffledStudents[j]] = [shuffledStudents[j], shuffledStudents[i]];
    }

    const shuffledAvatars = [...AVATAR_EMOJIS].sort(() => Math.random() - 0.5);

    const newAssignments = [];
    const count = Math.max(state.roles.length, shuffledStudents.length);

    for (let idx = 0; idx < count; idx++) {
      const role = state.roles[idx] || {
        id: idx + 1,
        name: `자율 도우미 ${idx + 1}`,
        emoji: "⭐",
        desc: "교실 속 필요한 곳에서 스스로 돕기",
        color: "yellow",
        category: "기타"
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
      // 롤링 애니메이션
      if (elements.subStatusText) elements.subStatusText.textContent = "🎲 무작위 롤링 배정 진행 중...";
      elements.cardsGrid.style.opacity = "0.7";

      let rollCount = 0;
      const maxRolls = 6;
      const interval = setInterval(() => {
        rollCount++;
        const tempNames = [...state.students].sort(() => Math.random() - 0.5);
        renderTemporaryRolling(tempNames);

        if (rollCount >= maxRolls) {
          clearInterval(interval);
          elements.cardsGrid.style.opacity = "1";
          state.assignments = newAssignments;
          saveStateToLocalStorage();
          updateDashboardStats();
          renderCards();
          updatePrintBoardHeader();
          state.isShuffling = false;

          launchConfetti();
          showToast(`🎉 네이버 스타일 1인 1역할 배정 완료 (${state.assignments.length}명)`);
        }
      }, 100);
    } else {
      state.assignments = newAssignments;
      saveStateToLocalStorage();
      updateDashboardStats();
      renderCards();
      updatePrintBoardHeader();
      state.isShuffling = false;
      showToast("새로운 순서로 다시 배정되었습니다 🎲");
    }
  }

  function renderTemporaryRolling(tempNames) {
    const cards = elements.cardsGrid?.querySelectorAll(".nv-card");
    cards?.forEach((card, i) => {
      const nameEl = card.querySelector(".nv-student-name");
      if (nameEl && tempNames[i % tempNames.length]) {
        nameEl.textContent = tempNames[i % tempNames.length];
        nameEl.style.color = "var(--naver-green)";
      }
    });
  }

  // --------------------------------------------------------------------------
  // 네이버 스타일 카드 그리드 렌더링 (검색 & 카테고리 필터링 적용)
  // --------------------------------------------------------------------------
  function renderCards() {
    if (!elements.cardsGrid) return;
    elements.cardsGrid.innerHTML = "";

    const isAssigned = state.assignments.length > 0;
    const allItems = isAssigned ? state.assignments : state.roles.map((r, i) => ({
      index: i + 1,
      student: null,
      role: r,
      avatar: "👤"
    }));

    // 필터링 적용 (카테고리 & 검색어)
    const filteredItems = allItems.filter(item => {
      // 카테고리 필터
      if (state.selectedCategory !== "ALL") {
        if (item.role.category !== state.selectedCategory) {
          return false;
        }
      }

      // 검색어 필터
      if (state.searchQuery) {
        const studentMatch = item.student ? item.student.toLowerCase().includes(state.searchQuery) : false;
        const roleMatch = item.role.name.toLowerCase().includes(state.searchQuery);
        const descMatch = (item.role.desc || "").toLowerCase().includes(state.searchQuery);
        if (!studentMatch && !roleMatch && !descMatch) {
          return false;
        }
      }

      return true;
    });

    // 헤더 카운터 갱신
    if (elements.boardCounter) {
      elements.boardCounter.textContent = `${filteredItems.length}개 / 총 ${allItems.length}개`;
    }

    if (filteredItems.length === 0) {
      elements.cardsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; color: var(--nv-text-muted);">
          <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
          <div style="font-size: 15px; font-weight: 700; color: var(--nv-text-title);">일치하는 역할 또는 학생이 없습니다.</div>
          <div style="font-size: 12px; margin-top: 4px;">검색어를 변경하거나 전체 카테고리를 선택해 보세요.</div>
        </div>
      `;
      return;
    }

    filteredItems.forEach((item) => {
      const card = document.createElement("div");
      card.className = "nv-card";

      const hasStudent = Boolean(item.student);
      const roleColor = item.role.color || "mint";

      card.innerHTML = `
        <div class="nv-card-top">
          <span class="nv-role-badge nv-badge-${roleColor}">
            ${escapeHtml(item.role.category || '학급역할')}
          </span>
          <span class="nv-card-index">#${item.index}</span>
        </div>

        <div class="nv-card-body">
          <div class="nv-card-emoji-box">
            ${item.role.emoji || '🌱'}
          </div>
          <div class="nv-card-info">
            <h3 class="nv-card-role-name">${escapeHtml(item.role.name)}</h3>
            <p class="nv-card-role-desc">${escapeHtml(item.role.desc || '')}</p>
          </div>
        </div>

        <div class="nv-card-footer">
          <div class="nv-student-badge-wrap">
            <div class="nv-student-avatar">${item.avatar || '👦'}</div>
            <div class="nv-student-details">
              <span class="nv-student-label">담당 학생</span>
              <span class="nv-student-name">
                ${hasStudent ? escapeHtml(item.student) : '<span class="nv-student-empty">배정 대기중</span>'}
              </span>
            </div>
          </div>
          ${hasStudent ? `
            <button class="nv-btn-swap" title="다른 학생과 바꾸기" data-index="${item.index - 1}">
              ⇄
            </button>
          ` : ''}
        </div>
      `;

      const swapBtn = card.querySelector(".nv-btn-swap");
      if (swapBtn) {
        swapBtn.addEventListener("click", () => handleSingleCardSwap(item.index - 1));
      }

      elements.cardsGrid.appendChild(card);
    });
  }

  function handleSingleCardSwap(targetIndex) {
    if (!state.assignments[targetIndex]) return;

    const currentStudent = state.assignments[targetIndex].student;
    const newName = prompt(
      `[${state.assignments[targetIndex].role.name}]의 담당 학생을 직접 변경합니다.\n현재 담당: ${currentStudent}\n새로 배정할 학생 이름을 입력해 주세요:`,
      currentStudent
    );

    if (newName && newName.trim()) {
      state.assignments[targetIndex].student = newName.trim();
      saveStateToLocalStorage();
      renderCards();
      showToast(`${newName.trim()} 학생으로 수정되었습니다.`);
    }
  }

  // --------------------------------------------------------------------------
  // 대시보드 상태 갱신
  // --------------------------------------------------------------------------
  function updateDashboardStats() {
    if (elements.classNameDisplay) {
      elements.classNameDisplay.textContent = state.className;
    }
    if (elements.topClassName) {
      elements.topClassName.textContent = state.className;
    }
    if (elements.assignedDateDisplay) {
      elements.assignedDateDisplay.textContent = state.assignedDate 
        ? state.assignedDate 
        : "미배정";
    }
    if (elements.totalStudentsCount) {
      elements.totalStudentsCount.textContent = `${state.students.length}명`;
    }
    if (elements.totalRolesCount) {
      elements.totalRolesCount.textContent = `${state.roles.length}개`;
    }

    if (elements.assignStatusBadge) {
      const isComplete = state.assignments.length > 0;
      elements.assignStatusBadge.className = `nv-status-pill ${isComplete ? 'nv-status-complete' : 'nv-status-ready'}`;
      elements.assignStatusBadge.textContent = isComplete ? `배정 완료 (${state.assignments.length}명)` : "배정 대기중";
    }

    if (elements.subStatusText) {
      elements.subStatusText.textContent = state.assignments.length > 0 
        ? `전체 ${state.assignments.length}명 1인 1역할 배정 완료` 
        : "역할 배정 준비 완료";
    }

    if (elements.sheetSyncStatus) {
      elements.sheetSyncStatus.textContent = state.appsScriptUrl ? "연동 활성" : "미연동";
      elements.sheetSyncStatus.style.color = state.appsScriptUrl ? "var(--naver-green)" : "#8e959d";
    }
  }

  function updatePrintBoardHeader() {
    if (elements.printTitle) {
      elements.printTitle.textContent = `🏫 ${state.className} 1인 1역할 게시판`;
    }
    if (elements.printMetaDate) {
      elements.printMetaDate.textContent = state.assignedDate ? `배정일자: ${state.assignedDate}` : `작성일자: ${new Date().toLocaleDateString('ko-KR')}`;
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

  function handlePrint() {
    if (state.assignments.length === 0) {
      if (!confirm("아직 역할 배정이 되지 않았습니다. 빈 양식으로 인쇄하시겠습니까?")) {
        return;
      }
    }
    updatePrintBoardHeader();
    window.print();
  }

  // --------------------------------------------------------------------------
  // 결과 텍스트 복사
  // --------------------------------------------------------------------------
  function copyResultsToClipboard() {
    if (state.assignments.length === 0) {
      showToast("먼저 [🎲 역할 배정하기]를 진행해 주세요.");
      return;
    }

    let message = `📋 [${state.className} 1인 1역할 배정 현황]\n`;
    message += `📅 배정일: ${state.assignedDate || '미정'}\n\n`;

    state.assignments.forEach((item, i) => {
      message += `${i + 1}. ${item.student}: ${item.role.name} ${item.role.emoji} (${item.role.desc})\n`;
    });

    message += `\n🌱 우리 모두 맡은 역할을 책임감 있게 실천해요!`;

    navigator.clipboard.writeText(message).then(() => {
      showToast("📋 결과 텍스트가 복사되었습니다! (알림장/메신저에 붙여넣기)");
    }).catch(() => {
      const tempArea = document.createElement("textarea");
      tempArea.value = message;
      document.body.appendChild(tempArea);
      tempArea.select();
      document.execCommand("copy");
      document.body.removeChild(tempArea);
      showToast("📋 결과 텍스트가 복사되었습니다!");
    });
  }

  // --------------------------------------------------------------------------
  // 모달 1: 학생 명단 및 역할 관리
  // --------------------------------------------------------------------------
  function openManageModal() {
    if (!elements.manageModal) return;
    elements.inputClassName.value = state.className;
    elements.textareaStudents.value = state.students.join("\n");
    elements.textareaRoles.value = state.roles.map(r => `${r.name} | ${r.desc} | ${r.emoji} | ${r.category || '교실환경'}`).join("\n");

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
    if (elements.studentsCountBadge) elements.studentsCountBadge.textContent = `${studentLines.length}명`;

    const rawRoles = elements.textareaRoles?.value || "";
    const roleLines = rawRoles.split("\n").map(s => s.trim()).filter(Boolean);
    if (elements.rolesCountBadge) elements.rolesCountBadge.textContent = `${roleLines.length}개`;
  }

  function saveManageSettings() {
    const newClass = elements.inputClassName.value.trim() || "3학년 2반";
    state.className = newClass;

    const rawStudents = elements.textareaStudents.value;
    const studentList = rawStudents.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (studentList.length === 0) {
      alert("최소 1명 이상의 학생 이름을 입력해 주세요.");
      return;
    }
    state.students = studentList;

    const rawRoles = elements.textareaRoles.value;
    const roleLines = rawRoles.split("\n").map(s => s.trim()).filter(Boolean);
    if (roleLines.length === 0) {
      alert("최소 1개 이상의 역할을 입력해 주세요.");
      return;
    }

    const colorPalettes = ["mint", "sky", "yellow", "peach", "lavender", "rose", "green"];
    state.roles = roleLines.map((line, idx) => {
      const parts = line.split("|").map(p => p.trim());
      const name = parts[0] || `역할 ${idx + 1}`;
      const desc = parts[1] || "학급을 위해 성실히 실천해요";
      const emoji = parts[2] || "🌱";
      const cat = parts[3] || "교실환경";
      return {
        id: idx + 1,
        name: name,
        desc: desc,
        emoji: emoji,
        category: cat,
        color: colorPalettes[idx % colorPalettes.length]
      };
    });

    saveStateToLocalStorage();
    updateDashboardStats();
    renderCards();
    updatePrintBoardHeader();
    closeManageModal();
    showToast("학생 명단과 역할 목록이 저장되었습니다.");
  }

  function resetToDefaultManage() {
    if (confirm("기본 12명 학생 및 12개 역할 데이터로 되돌리시겠습니까?")) {
      elements.inputClassName.value = "3학년 2반";
      elements.textareaStudents.value = DEFAULT_STUDENTS.join("\n");
      elements.textareaRoles.value = DEFAULT_ROLES.map(r => `${r.name} | ${r.desc} | ${r.emoji} | ${r.category}`).join("\n");
      updateManageCounts();
    }
  }

  // --------------------------------------------------------------------------
  // 모달 2: 구글 스프레드시트(Apps Script) 연동
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
        : "💡 Apps Script 웹 앱 배포 URL을 여기에 입력하여 시트와 실시간 연동할 수 있습니다.";
    }
  }

  function closeSheetModal() {
    elements.sheetModal?.classList.remove("active");
  }

  function saveSheetUrlFromModal() {
    const url = elements.inputAppsScriptUrl.value.trim();
    state.appsScriptUrl = url;
    saveStateToLocalStorage();
    updateDashboardStats();
    showToast("스프레드시트 연동 URL이 저장되었습니다.");
  }

  async function executeSheetLoad() {
    const url = elements.inputAppsScriptUrl.value.trim();
    if (!url) {
      alert("구글 Apps Script 배포 URL을 입력해 주세요.\n(미입력 시 기본 12명 명단 데이터로 리셋 테스트를 진행합니다)");
      if (confirm("연동 URL 없이 기본 12명 데이터로 리셋할까요?")) {
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
      showToast("✅ 구글 시트에서 데이터를 성공적으로 불러왔습니다!");
    } catch (err) {
      console.error(err);
      alert(`시트 불러오기 중 오류가 발생했습니다: ${err.message}\n\n* Apps Script 웹 앱 배포 시 '액세스 권한: 모든 사용자(Anyone)'로 설정되었는지 확인해 주세요.`);
    }
  }

  async function executeSheetSave() {
    if (state.assignments.length === 0) {
      alert("저장할 배정 결과가 없습니다. 먼저 [🎲 역할 배정하기]를 진행해 주세요.");
      return;
    }

    const url = elements.inputAppsScriptUrl.value.trim();
    if (!url) {
      alert("구글 Apps Script 배포 URL을 입력해 주세요.");
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

      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      state.appsScriptUrl = url;
      saveStateToLocalStorage();
      closeSheetModal();
      showToast("✅ 구글 스프레드시트에 저장을 요청했습니다!");
    } catch (err) {
      console.error(err);
      alert(`시트 저장 중 오류가 발생했습니다: ${err.message}`);
    }
  }

  function copyAppsScriptCode() {
    const code = `/**
 * [우리 반 1인 1역할 배정기 Google Apps Script 연동 코드]
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
          category: rData[j][3] || "교실환경",
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
      showToast("📋 Apps Script 템플릿 코드가 복사되었습니다!");
    });
  }

  // --------------------------------------------------------------------------
  // 축하 콘페티 파티클
  // --------------------------------------------------------------------------
  function launchConfetti() {
    const canvas = elements.confettiCanvas;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width = window.innerWidth;
    const height = canvas.height = window.innerHeight;

    // 네이버 그린 중심의 파티클 색상
    const colors = ["#03c75a", "#02b350", "#2db400", "#1ec800", "#ffba00", "#38d9a9"];
    const particles = [];
    const particleCount = 80;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: width * 0.5 + (Math.random() - 0.5) * 200,
        y: height * 0.35 + (Math.random() - 0.5) * 100,
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
          p.vy += 0.35;
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
  // 토스트 메시지
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
