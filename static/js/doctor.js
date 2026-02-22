(function () {
  // API Base URL - auto-detect from current location
  const API_BASE = (window.location.protocol === 'file:' || !window.location.origin.includes('localhost')) 
    ? 'http://localhost:8000' 
    : window.location.origin;
  const IS_BACKEND = window.location.origin.includes('localhost:8000') || window.location.origin.includes('127.0.0.1:8000');
  const LOGIN_URL = (!IS_BACKEND || window.location.protocol === 'file:') ? 'doctor_login.html' : "/doctor/login";
  
  console.log('[Doctor.js] Script loaded');
  
  // Check authentication
  if (typeof AUTH !== 'undefined') {
    if (!AUTH.requireRole('DOCTOR', LOGIN_URL)) {
      return; // Will redirect to login
    }
    console.log('[Doctor.js] Authenticated as:', AUTH.getUser()?.full_name);
    
    // Display user name in header
    const userNameEl = document.getElementById('user-name');
    if (userNameEl && AUTH.getUser()) {
      userNameEl.textContent = AUTH.getUser().full_name || AUTH.getUser().staff_id;
    }
  }
  
  // Helper to get auth headers
  const getHeaders = () => {
    const headers = { "Content-Type": "application/json" };
    if (typeof AUTH !== 'undefined' && AUTH.getToken()) {
      headers["Authorization"] = `Bearer ${AUTH.getToken()}`;
    }
    return headers;
  };
  
  const queuePending = document.getElementById("doctor-queue-pending");
  const queuePendingEmpty = document.getElementById("doctor-queue-pending-empty");
  const queueAdmitted = document.getElementById("doctor-queue-admitted");
  const queueAdmittedEmpty = document.getElementById("doctor-queue-admitted-empty");
  const queueApproved = document.getElementById("doctor-queue-approved");
  const queueApprovedEmpty = document.getElementById("doctor-queue-approved-empty");
  const queueDelayed = document.getElementById("doctor-queue-delayed");
  const queueDelayedEmpty = document.getElementById("doctor-queue-delayed-empty");
  const queueSubtitle = document.getElementById("doctor-queue-subtitle");
  const queueTogglePending = document.getElementById("doctor-queue-toggle-pending");
  const queueToggleAdmitted = document.getElementById("doctor-queue-toggle-admitted");
  const queueToggleApproved = document.getElementById("doctor-queue-toggle-approved");
  const queueToggleDelayed = document.getElementById("doctor-queue-toggle-delayed");

  const patientName = document.getElementById("patient-name");
  const patientMeta = document.getElementById("patient-meta");
  const patientTimestamp = document.getElementById("patient-timestamp");
  const priorityPill = document.getElementById("priority-pill");
  const chiefComplaint = document.getElementById("chief-complaint");
  const vitalsSummary = document.getElementById("vitals-summary");
  const vitalsChart = document.getElementById("vitals-chart");
  const aiSummary = document.getElementById("ai-summary");
  const redFlags = document.getElementById("red-flags");
  const differentialList = document.getElementById("differential-list");
  const nextSteps = document.getElementById("next-steps");
  const recommendedQuestions = document.getElementById("recommended-questions");
  const doctorNote = document.getElementById("doctor-note");
  const urgencyScore = document.getElementById("urgency-score");
  const urgencyLabel = document.getElementById("urgency-label");
  const severityRing = document.getElementById("severity-ring");

  const decisionAdmit = document.getElementById("decision-admit");
  const decisionApprove = document.getElementById("decision-approve");
  const decisionDelay = document.getElementById("decision-delay");
  const decisionRelease = document.getElementById("decision-release");
  const decisionError = document.getElementById("decision-error");

  let currentIntakeId = null;
  let currentDoctorStatus = "PENDING";
  let viewMode = "pending";
  let lastCounts = { pending: 0, admitted: 0, approved: 0, delayed: 0 };

  const setPriority = (level) => {
    const norm = (level || "PENDING").toUpperCase();
    if (!priorityPill) return;
    priorityPill.textContent = norm;
    
    let pillClass = "px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide border ";
    if (norm === "HIGH") {
      pillClass += "bg-red-100 text-red-600 border-red-200";
    } else if (norm === "MED") {
      pillClass += "bg-amber-100 text-amber-600 border-amber-200";
    } else if (norm === "LOW") {
      pillClass += "bg-emerald-100 text-emerald-600 border-emerald-200";
    } else {
      pillClass += "bg-slate-100 text-slate-600 border-slate-200";
    }
    priorityPill.className = pillClass;

    // Update risk gauge
    let score = 0;
    let label = "PENDING";
    let labelColor = "text-slate-500";
    
    if (norm === "HIGH") {
      score = 85;
      label = "CRITICAL";
      labelColor = "text-red-600";
    } else if (norm === "MED") {
      score = 55;
      label = "MODERATE";
      labelColor = "text-amber-600";
    } else if (norm === "LOW") {
      score = 25;
      label = "LOW RISK";
      labelColor = "text-emerald-600";
    }
    
    if (urgencyScore) urgencyScore.textContent = score + "%";
    if (urgencyLabel) {
      urgencyLabel.textContent = label;
      urgencyLabel.className = "severity-label " + labelColor;
    }
    
    // Animate gauge needle
    if (window.setRiskGauge) window.setRiskGauge(score);
    if (window.setSeverityDial) window.setSeverityDial(score, norm);
  };

  const normalizeDoctorStatus = (value) => {
    if (!value) return "PENDING";
    const norm = String(value).trim().toUpperCase();
    if (["ADMIT", "ADMITTED"].includes(norm)) return "ADMITTED";
    if (["NOT_ADMIT", "APPROVE", "APPROVED", "RELEASE"].includes(norm)) return "APPROVED";
    if (["DELAY", "DELAYED"].includes(norm)) return "DELAYED";
    if (norm === "PENDING") return "PENDING";
    return "PENDING";
  };

  const getDoctorStatus = (item) => {
    return normalizeDoctorStatus(item?.doctor_status || item?.clinical_summary?.decision);
  };

  const updateQueueSubtitle = (mode) => {
    if (!queueSubtitle) return;
    const count = lastCounts[mode] || 0;
    if (mode === "pending") {
      queueSubtitle.textContent = `${count} case${count !== 1 ? 's' : ''} ready for review`;
    } else if (mode === "admitted") {
      queueSubtitle.textContent = `${count} admitted patient${count !== 1 ? 's' : ''}`;
    } else if (mode === "approved") {
      queueSubtitle.textContent = `${count} approved discharge${count !== 1 ? 's' : ''}`;
    } else if (mode === "delayed") {
      queueSubtitle.textContent = `${count} delayed case${count !== 1 ? 's' : ''}`;
    } else {
      queueSubtitle.textContent = "Case queue";
    }
  };

  const setTabActive = (btn, isActive) => {
    if (!btn) return;
    if (isActive) {
      btn.className = "flex-1 px-2 py-2 text-xs font-semibold rounded-md bg-white text-slate-800 shadow-sm transition-all";
    } else {
      btn.className = "flex-1 px-2 py-2 text-xs font-semibold rounded-md text-slate-500 hover:text-slate-700 transition-all";
    }
  };

  const formatTimestamp = (value) => {
    if (!value) return "--";
    try {
      const iso = String(value).includes("T") ? value : String(value).replace(" ", "T") + "Z";
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return "--";
      return date.toLocaleString();
    } catch (e) {
      return "--";
    }
  };

  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

  const VITAL_RANGES = {
    heart_rate: { label: "HR", min: 40, max: 160, normalMin: 60, normalMax: 100, unit: "bpm" },
    respiratory_rate: { label: "RR", min: 8, max: 40, normalMin: 12, normalMax: 20, unit: "/min" },
    temperature_c: { label: "Temp", min: 34, max: 41, normalMin: 36.1, normalMax: 37.5, unit: "C" },
    spo2: { label: "SpO2", min: 80, max: 100, normalMin: 95, normalMax: 100, unit: "%" },
    systolic_bp: { label: "SBP", min: 70, max: 180, normalMin: 100, normalMax: 120, unit: "mmHg" },
  };

  const formatVitalValue = (key, value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "--";
    if (key === "temperature_c") return value.toFixed(1);
    return Math.round(value).toString();
  };

  const renderVitalsChart = (vitals) => {
    if (!vitalsChart) return;
    if (!vitals) {
      vitalsChart.innerHTML = `<p class="text-xs text-slate-400">No vitals available.</p>`;
      return;
    }

    const rows = Object.entries(VITAL_RANGES).map(([key, range]) => {
      const raw = Number(vitals[key]);
      if (!Number.isFinite(raw)) {
        return `
          <div class="vital-row">
            <span class="vital-label">${range.label}</span>
            <div class="vital-track"></div>
            <span class="vital-value">--</span>
          </div>
        `;
      }

      const value = clamp(raw, range.min, range.max);
      const percent = ((value - range.min) / (range.max - range.min)) * 100;
      const normalStart = ((range.normalMin - range.min) / (range.max - range.min)) * 100;
      const normalWidth = ((range.normalMax - range.normalMin) / (range.max - range.min)) * 100;
      let state = "normal";
      if (raw < range.normalMin) state = "low";
      if (raw > range.normalMax) state = "high";

      return `
        <div class="vital-row">
          <span class="vital-label">${range.label}</span>
          <div class="vital-track">
            <div class="vital-normal" style="left: ${normalStart}%; width: ${normalWidth}%;"></div>
            <div class="vital-indicator ${state}" style="left: ${percent}%;"></div>
          </div>
          <span class="vital-value ${state}">${formatVitalValue(key, raw)}${range.unit}</span>
        </div>
      `;
    });

    vitalsChart.innerHTML = rows.join("");
  };

  window.setSeverityDial = function(score, level) {
    if (!severityRing) return;
    const clamped = Math.max(0, Math.min(100, score || 0));
    let color = "#94a3b8";
    if (level === "HIGH") color = "#ef4444";
    else if (level === "MED") color = "#f59e0b";
    else if (level === "LOW") color = "#22c55e";
    severityRing.style.background = `conic-gradient(${color} ${clamped}%, #e2e8f0 ${clamped}% 100%)`;
  };

  const renderRedFlags = (items) => {
    if (!redFlags) return;
    if (!items || items.length === 0) {
      redFlags.innerHTML = '<p class="text-sm text-emerald-600 flex items-center gap-2"><span class="material-symbols-outlined text-lg">check_circle</span>No red flags detected</p>';
      return;
    }
    redFlags.innerHTML = items.map((item) => `
      <div class="flex items-start gap-3 p-3 bg-red-100/50 rounded-lg">
        <span class="material-symbols-outlined text-red-500 text-lg flex-shrink-0">warning</span>
        <p class="text-sm font-medium text-red-700">${item}</p>
      </div>
    `).join("");
  };

  const renderDifferential = (items) => {
    if (!differentialList) return;
    if (!items || items.length === 0) {
      differentialList.innerHTML = '<li class="text-sm text-slate-400">Awaiting analysis...</li>';
      return;
    }
    differentialList.innerHTML = items.map((item) => `
      <li class="flex items-start gap-2 text-sm text-slate-700">
        <span class="material-symbols-outlined text-indigo-400 text-sm mt-0.5">circle</span>
        ${item}
      </li>
    `).join("");
  };

  const renderNextSteps = (items) => {
    if (!nextSteps) return;
    if (!items || items.length === 0) {
      nextSteps.innerHTML = '<li class="flex items-start gap-2 text-sm opacity-75"><span class="material-symbols-outlined text-sm">arrow_forward</span>Select a case to view recommendations</li>';
      return;
    }
    nextSteps.innerHTML = items.map((item) => `
      <li class="flex items-start gap-2 text-sm">
        <span class="material-symbols-outlined text-sm mt-0.5">arrow_forward</span>
        ${item}
      </li>
    `).join("");
  };

  const renderQuestions = (items) => {
    if (!recommendedQuestions) return;
    if (!items || items.length === 0) {
      recommendedQuestions.innerHTML = '<li class="text-sm text-slate-400">Select a case to view questions</li>';
      return;
    }
    recommendedQuestions.innerHTML = items.map((item) => `
      <li class="flex items-start gap-2 text-sm text-slate-700">
        <span class="material-symbols-outlined text-sky-400 text-sm mt-0.5">help</span>
        ${item}
      </li>
    `).join("");
  };
  const renderVitals = (vitals) => {
    if (!vitalsSummary) return;
    if (!vitals) {
      vitalsSummary.innerHTML = `
        <div class="text-center p-2.5 bg-slate-50 rounded-lg"><p class="text-[10px] text-slate-500 font-medium mb-0.5">HR</p><p class="text-base font-bold text-slate-800">--</p></div>
        <div class="text-center p-2.5 bg-slate-50 rounded-lg"><p class="text-[10px] text-slate-500 font-medium mb-0.5">RR</p><p class="text-base font-bold text-slate-800">--</p></div>
        <div class="text-center p-2.5 bg-slate-50 rounded-lg"><p class="text-[10px] text-slate-500 font-medium mb-0.5">Temp</p><p class="text-base font-bold text-slate-800">--</p></div>
        <div class="text-center p-2.5 bg-slate-50 rounded-lg"><p class="text-[10px] text-slate-500 font-medium mb-0.5">SpO2</p><p class="text-base font-bold text-slate-800">--</p></div>
        <div class="text-center p-2.5 bg-slate-50 rounded-lg col-span-2"><p class="text-[10px] text-slate-500 font-medium mb-0.5">Blood Pressure</p><p class="text-base font-bold text-slate-800">--/--</p></div>
      `;
      renderVitalsChart(null);
      return;
    }
    
    // Highlight abnormal values
    const hrClass = (vitals.heart_rate > 100 || vitals.heart_rate < 60) ? "text-amber-600" : "text-slate-800";
    const rrClass = vitals.respiratory_rate > 20 ? "text-amber-600" : "text-slate-800";
    const tempClass = vitals.temperature_c >= 38 ? "text-red-600" : "text-slate-800";
    const spo2Class = vitals.spo2 < 95 ? "text-red-600" : "text-slate-800";
    const bpClass = (vitals.systolic_bp > 140 || vitals.systolic_bp < 90) ? "text-amber-600" : "text-slate-800";
    
    vitalsSummary.innerHTML = `
      <div class="text-center p-2.5 bg-slate-50 rounded-lg"><p class="text-[10px] text-slate-500 font-medium mb-0.5">HR</p><p class="text-base font-bold ${hrClass}">${vitals.heart_rate}</p></div>
      <div class="text-center p-2.5 bg-slate-50 rounded-lg"><p class="text-[10px] text-slate-500 font-medium mb-0.5">RR</p><p class="text-base font-bold ${rrClass}">${vitals.respiratory_rate}</p></div>
      <div class="text-center p-2.5 bg-slate-50 rounded-lg"><p class="text-[10px] text-slate-500 font-medium mb-0.5">Temp</p><p class="text-base font-bold ${tempClass}">${vitals.temperature_c}&deg;C</p></div>
      <div class="text-center p-2.5 bg-slate-50 rounded-lg"><p class="text-[10px] text-slate-500 font-medium mb-0.5">SpO2</p><p class="text-base font-bold ${spo2Class}">${vitals.spo2}%</p></div>
      <div class="text-center p-2.5 bg-slate-50 rounded-lg col-span-2"><p class="text-[10px] text-slate-500 font-medium mb-0.5">Blood Pressure</p><p class="text-base font-bold ${bpClass}">${vitals.systolic_bp}/${vitals.diastolic_bp}</p></div>
    `;
    renderVitalsChart(vitals);
  };

  const renderQueue = (items, targetEl, emptyEl, showStatus = false) => {
    if (!targetEl) return;
    if (!items || items.length === 0) {
      targetEl.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    targetEl.innerHTML = items
      .map((i) => {
        const priority = i.clinical_summary?.priority_level || i.priority_level || "PENDING";
        const isActive = currentIntakeId === i.id;
        let priorityBadgeClass = "bg-slate-100 text-slate-500";
        if (priority === "HIGH") priorityBadgeClass = "bg-red-100 text-red-600";
        else if (priority === "MED") priorityBadgeClass = "bg-amber-100 text-amber-600";
        else if (priority === "LOW") priorityBadgeClass = "bg-emerald-100 text-emerald-600";

        const status = getDoctorStatus(i);
        const statusLabel = showStatus ? `<span class="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">${status}</span>` : "";
        
        return `
          <div class="case-card ${isActive ? 'active' : ''}" data-id="${i.id}">
            <div class="flex items-start justify-between gap-2 mb-1.5">
              <h3 class="font-semibold text-slate-800 text-sm">${i.full_name}</h3>
              <div class="flex items-center gap-1.5">
                ${statusLabel}
                <span class="text-[10px] font-bold px-2 py-0.5 rounded ${priorityBadgeClass} uppercase">${priority}</span>
              </div>
            </div>
            <p class="text-xs text-slate-500 mb-1">${i.age} yrs • ${i.sex || 'N/A'}</p>
            <p class="text-[11px] text-slate-400">${formatTimestamp(i.doctor_status_updated_at || i.created_at)}</p>
            <p class="text-xs text-slate-600 line-clamp-1">${i.chief_complaint}</p>
          </div>
        `;
      })
      .join("");
  };

  const setViewMode = (mode) => {
    viewMode = mode;
    setTabActive(queueTogglePending, mode === "pending");
    setTabActive(queueToggleAdmitted, mode === "admitted");
    setTabActive(queueToggleApproved, mode === "approved");
    setTabActive(queueToggleDelayed, mode === "delayed");

    if (queuePending) queuePending.classList.toggle('hidden', mode !== "pending");
    if (queuePendingEmpty) queuePendingEmpty.classList.toggle('hidden', mode !== "pending");
    if (queueAdmitted) queueAdmitted.classList.toggle('hidden', mode !== "admitted");
    if (queueAdmittedEmpty) queueAdmittedEmpty.classList.toggle('hidden', mode !== "admitted");
    if (queueApproved) queueApproved.classList.toggle('hidden', mode !== "approved");
    if (queueApprovedEmpty) queueApprovedEmpty.classList.toggle('hidden', mode !== "approved");
    if (queueDelayed) queueDelayed.classList.toggle('hidden', mode !== "delayed");
    if (queueDelayedEmpty) queueDelayedEmpty.classList.toggle('hidden', mode !== "delayed");

    updateQueueSubtitle(mode);
  };

  const updateDetails = (data) => {
    currentIntakeId = data.id;
    if (patientName) {
      patientName.textContent = `${data.full_name}, ${data.age}${data.sex ? data.sex[0] : ''}`;
    }
    if (patientMeta) patientMeta.textContent = `Patient ID: #${data.id}`;
    if (patientTimestamp) {
      const stamp = data.doctor_status_updated_at || data.created_at;
      patientTimestamp.textContent = `Last update: ${formatTimestamp(stamp)}`;
    }
    if (chiefComplaint) chiefComplaint.textContent = data.chief_complaint || "--";
    if (aiSummary) aiSummary.textContent = data.clinical_summary?.short_summary || "Select a case to view AI-generated clinical summary.";

    setPriority(data.clinical_summary?.priority_level);
    renderVitals(data.vitals);
    renderRedFlags(data.clinical_summary?.red_flags || []);
    renderDifferential(data.clinical_summary?.differential || []);
    renderQuestions(data.clinical_summary?.recommended_questions || []);
    renderNextSteps(data.clinical_summary?.recommended_next_steps || []);

    if (doctorNote) {
      doctorNote.value = data.clinical_summary?.doctor_note || "";
    }

    currentDoctorStatus = getDoctorStatus(data);
    if (decisionRelease && decisionApprove) {
      if (currentDoctorStatus === "ADMITTED") {
        decisionRelease.classList.remove("hidden");
        decisionRelease.classList.add("flex");
        decisionApprove.classList.add("hidden");
      } else {
        decisionRelease.classList.add("hidden");
        decisionRelease.classList.remove("flex");
        decisionApprove.classList.remove("hidden");
      }
    }
  };

  const loadCase = async (id) => {
    const res = await fetch(API_BASE + `/api/intakes/${encodeURIComponent(id)}`, {
      headers: getHeaders()
    });
    if (res.status === 401) {
      console.log('[Doctor.js] 401 - redirecting to login');
      if (typeof AUTH !== 'undefined') AUTH.logout(LOGIN_URL);
      return;
    }
    if (!res.ok) throw new Error("Failed to load case");
    const data = await res.json();
    updateDetails(data);
    // Refresh queue to show active state
    loadQueue();
  };

  const loadQueue = async () => {
    const res = await fetch(API_BASE + "/api/intakes", {
      headers: getHeaders()
    });
    if (res.status === 401) {
      console.log('[Doctor.js] 401 - redirecting to login');
      if (typeof AUTH !== 'undefined') AUTH.logout(LOGIN_URL);
      return;
    }
    const data = await res.json();
    const items = Array.isArray(data) ? data : data.items || [];

    const pending = items.filter((i) => i.workflow_status === "PENDING_DOCTOR");
    const admitted = items.filter((i) => getDoctorStatus(i) === "ADMITTED");
    const approved = items.filter((i) => getDoctorStatus(i) === "APPROVED");
    const delayed = items.filter((i) => getDoctorStatus(i) === "DELAYED");

    lastCounts = {
      pending: pending.length,
      admitted: admitted.length,
      approved: approved.length,
      delayed: delayed.length,
    };

    renderQueue(pending, queuePending, queuePendingEmpty, false);
    renderQueue(admitted, queueAdmitted, queueAdmittedEmpty, true);
    renderQueue(approved, queueApproved, queueApprovedEmpty, true);
    renderQueue(delayed, queueDelayed, queueDelayedEmpty, true);
    updateQueueSubtitle(viewMode);

    const params = new URLSearchParams(window.location.search);
    const intakeId = params.get("intake_id");
    const currentList = { pending, admitted, approved, delayed }[viewMode] || pending;
    if (intakeId && currentList.find((i) => String(i.id) === String(intakeId)) && !currentIntakeId) {
      await loadCase(intakeId);
    } else if (currentList.length > 0 && !currentIntakeId) {
      await loadCase(currentList[0].id);
    }
  };

  const attachQueueClick = (element) => {
    if (!element) return;
    element.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-id]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      if (id) loadCase(id).catch(console.error);
    });
  };

  attachQueueClick(queuePending);
  attachQueueClick(queueAdmitted);
  attachQueueClick(queueApproved);
  attachQueueClick(queueDelayed);

  const submitDecision = async (decision) => {
    if (!currentIntakeId) {
      if (window.showToast) {
        window.showToast('No Case Selected', 'Please select a case first.', true);
      }
      return;
    }
    if (decisionError) {
      decisionError.classList.add("hidden");
      decisionError.textContent = "";
    }
    try {
      const res = await fetch(API_BASE + `/api/intakes/${currentIntakeId}/decision`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          decision,
          doctor_note: doctorNote ? doctorNote.value : "",
        }),
      });
      if (res.status === 401) {
        console.log('[Doctor.js] 401 - redirecting to login');
        if (typeof AUTH !== 'undefined') AUTH.logout(LOGIN_URL);
        return;
      }
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Decision failed");
      }
      const status = normalizeDoctorStatus(decision);
      // Show success modal instead of alert
      if (window.showSuccessModal) {
        window.showSuccessModal(status);
      } else {
        alert(`Decision saved: ${status}`);
        window.location.reload();
      }
    } catch (err) {
      if (window.showToast) {
        window.showToast('Error', 'Unable to save decision. Please retry.', true);
      }
      if (decisionError) {
        decisionError.textContent = "Unable to save decision. Please retry.";
        decisionError.classList.remove("hidden");
      }
      console.error(err);
    }
  };

  if (decisionAdmit) decisionAdmit.addEventListener("click", () => submitDecision("ADMIT"));
  if (decisionApprove) decisionApprove.addEventListener("click", () => submitDecision("APPROVE"));
  if (decisionDelay) decisionDelay.addEventListener("click", () => submitDecision("DELAY"));
  if (decisionRelease) decisionRelease.addEventListener("click", () => submitDecision("RELEASE"));

  if (queueTogglePending) {
    queueTogglePending.addEventListener("click", () => setViewMode("pending"));
  }
  if (queueToggleAdmitted) {
    queueToggleAdmitted.addEventListener("click", () => setViewMode("admitted"));
  }
  if (queueToggleApproved) {
    queueToggleApproved.addEventListener("click", () => setViewMode("approved"));
  }
  if (queueToggleDelayed) {
    queueToggleDelayed.addEventListener("click", () => setViewMode("delayed"));
  }

  setViewMode(viewMode);
  loadQueue().catch(console.error);
})();
