(function () {
  // API Base URL - auto-detect from current location
  const API_BASE = (window.location.protocol === 'file:' || !window.location.origin.includes('localhost')) 
    ? 'http://localhost:8000' 
    : window.location.origin;
  const LOGIN_URL = "/doctor/login";
  
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
  
  const queue = document.getElementById("doctor-queue");
  const queueEmpty = document.getElementById("doctor-queue-empty");
  const queueSubtitle = document.getElementById("doctor-queue-subtitle");

  const patientName = document.getElementById("patient-name");
  const patientMeta = document.getElementById("patient-meta");
  const priorityPill = document.getElementById("priority-pill");
  const chiefComplaint = document.getElementById("chief-complaint");
  const vitalsSummary = document.getElementById("vitals-summary");
  const aiSummary = document.getElementById("ai-summary");
  const redFlags = document.getElementById("red-flags");
  const differentialList = document.getElementById("differential-list");
  const nextSteps = document.getElementById("next-steps");
  const doctorNote = document.getElementById("doctor-note");
  const urgencyScore = document.getElementById("urgency-score");
  const urgencyLabel = document.getElementById("urgency-label");

  const decisionAdmit = document.getElementById("decision-admit");
  const decisionDeny = document.getElementById("decision-deny");
  const decisionError = document.getElementById("decision-error");

  let currentIntakeId = null;

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
      urgencyLabel.className = "text-sm font-semibold uppercase tracking-wide " + labelColor;
    }
    
    // Animate gauge needle
    if (window.setRiskGauge) window.setRiskGauge(score);
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

  const renderVitals = (vitals) => {
    if (!vitalsSummary) return;
    if (!vitals) {
      vitalsSummary.innerHTML = `
        <div class="text-center p-3 bg-slate-50 rounded-xl"><p class="text-xs text-slate-500 font-medium">HR</p><p class="text-lg font-bold text-slate-800">--</p></div>
        <div class="text-center p-3 bg-slate-50 rounded-xl"><p class="text-xs text-slate-500 font-medium">RR</p><p class="text-lg font-bold text-slate-800">--</p></div>
        <div class="text-center p-3 bg-slate-50 rounded-xl"><p class="text-xs text-slate-500 font-medium">Temp</p><p class="text-lg font-bold text-slate-800">--</p></div>
        <div class="text-center p-3 bg-slate-50 rounded-xl"><p class="text-xs text-slate-500 font-medium">SpO2</p><p class="text-lg font-bold text-slate-800">--</p></div>
        <div class="text-center p-3 bg-slate-50 rounded-xl col-span-2"><p class="text-xs text-slate-500 font-medium">Blood Pressure</p><p class="text-lg font-bold text-slate-800">--/--</p></div>
      `;
      return;
    }
    
    // Highlight abnormal values
    const hrClass = (vitals.heart_rate > 100 || vitals.heart_rate < 60) ? "text-amber-600" : "text-slate-800";
    const rrClass = vitals.respiratory_rate > 20 ? "text-amber-600" : "text-slate-800";
    const tempClass = vitals.temperature_c >= 38 ? "text-red-600" : "text-slate-800";
    const spo2Class = vitals.spo2 < 95 ? "text-red-600" : "text-slate-800";
    const bpClass = (vitals.systolic_bp > 140 || vitals.systolic_bp < 90) ? "text-amber-600" : "text-slate-800";
    
    vitalsSummary.innerHTML = `
      <div class="text-center p-3 bg-slate-50 rounded-xl"><p class="text-xs text-slate-500 font-medium">HR</p><p class="text-lg font-bold ${hrClass}">${vitals.heart_rate}</p></div>
      <div class="text-center p-3 bg-slate-50 rounded-xl"><p class="text-xs text-slate-500 font-medium">RR</p><p class="text-lg font-bold ${rrClass}">${vitals.respiratory_rate}</p></div>
      <div class="text-center p-3 bg-slate-50 rounded-xl"><p class="text-xs text-slate-500 font-medium">Temp</p><p class="text-lg font-bold ${tempClass}">${vitals.temperature_c}°C</p></div>
      <div class="text-center p-3 bg-slate-50 rounded-xl"><p class="text-xs text-slate-500 font-medium">SpO2</p><p class="text-lg font-bold ${spo2Class}">${vitals.spo2}%</p></div>
      <div class="text-center p-3 bg-slate-50 rounded-xl col-span-2"><p class="text-xs text-slate-500 font-medium">Blood Pressure</p><p class="text-lg font-bold ${bpClass}">${vitals.systolic_bp}/${vitals.diastolic_bp}</p></div>
    `;
  };

  const renderQueue = (items) => {
    if (!queue) return;
    if (items.length === 0) {
      queue.innerHTML = '';
      if (queueEmpty) queueEmpty.classList.remove('hidden');
      return;
    }
    if (queueEmpty) queueEmpty.classList.add('hidden');
    
    queue.innerHTML = items
      .map((i) => {
        const priority = i.clinical_summary?.priority_level || i.priority_level || "PENDING";
        const isActive = currentIntakeId === i.id;
        let priorityBadgeClass = "bg-slate-100 text-slate-600";
        if (priority === "HIGH") priorityBadgeClass = "bg-red-100 text-red-600";
        else if (priority === "MED") priorityBadgeClass = "bg-amber-100 text-amber-600";
        else if (priority === "LOW") priorityBadgeClass = "bg-emerald-100 text-emerald-600";
        
        return `
          <div class="case-card bg-white/80 backdrop-blur-sm p-4 rounded-xl border-2 ${isActive ? 'active' : 'border-white/50'} shadow-lg shadow-slate-200/30 cursor-pointer" data-id="${i.id}">
            <div class="flex items-start justify-between gap-2 mb-2">
              <h3 class="font-bold text-slate-800">${i.full_name}</h3>
              <span class="text-xs font-bold px-2 py-1 rounded-full ${priorityBadgeClass} uppercase">${priority}</span>
            </div>
            <p class="text-sm text-slate-600 mb-1">${i.age} yrs • ${i.sex || 'N/A'}</p>
            <p class="text-xs text-slate-500 truncate"><span class="font-medium">CC:</span> ${i.chief_complaint}</p>
            <div class="flex items-center gap-2 mt-2 text-xs text-slate-400">
              <span class="material-symbols-outlined text-xs">schedule</span>
              ${i.created_at || 'Recent'}
            </div>
          </div>
        `;
      })
      .join("");
  };

  const updateDetails = (data) => {
    currentIntakeId = data.id;
    if (patientName) {
      patientName.textContent = `${data.full_name}, ${data.age}${data.sex ? data.sex[0] : ''}`;
    }
    if (patientMeta) patientMeta.textContent = `Patient ID: #${data.id}`;
    if (chiefComplaint) chiefComplaint.textContent = data.chief_complaint || "--";
    if (aiSummary) aiSummary.textContent = data.clinical_summary?.short_summary || "Select a case to view AI-generated clinical summary.";

    setPriority(data.clinical_summary?.priority_level);
    renderVitals(data.vitals);
    renderRedFlags(data.clinical_summary?.red_flags || []);
    renderDifferential(data.clinical_summary?.differential || []);
    renderNextSteps(data.clinical_summary?.recommended_next_steps || []);

    if (doctorNote) {
      doctorNote.value = data.clinical_summary?.doctor_note || "";
    }
  };

  const loadCase = async (id) => {
    const res = await fetch(API_BASE + `/api/intakes/${encodeURIComponent(id)}`, {
      headers: getHeaders()
    });
    if (res.status === 401) {
      console.log('[Doctor.js] 401 - redirecting to login');
      if (typeof AUTH !== 'undefined') AUTH.logout();
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
      if (typeof AUTH !== 'undefined') AUTH.logout();
      return;
    }
    const data = await res.json();
    const items = Array.isArray(data) ? data : data.items || [];
    const ready = items.filter((i) => i.has_summary);

    renderQueue(ready);
    if (queueSubtitle) queueSubtitle.textContent = `${ready.length} case${ready.length !== 1 ? 's' : ''} ready for review`;

    const params = new URLSearchParams(window.location.search);
    const intakeId = params.get("intake_id");
    if (intakeId && ready.find((i) => String(i.id) === String(intakeId)) && !currentIntakeId) {
      await loadCase(intakeId);
    } else if (ready.length > 0 && !currentIntakeId) {
      await loadCase(ready[0].id);
    }
  };

  if (queue) {
    queue.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-id]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      if (id) loadCase(id).catch(console.error);
    });
  }

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
        if (typeof AUTH !== 'undefined') AUTH.logout();
        return;
      }
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Decision failed");
      }
      // Show success modal instead of alert
      if (window.showSuccessModal) {
        window.showSuccessModal(decision === "ADMIT");
      } else {
        alert(`✅ Decision saved: ${decision === "ADMIT" ? "Patient Admitted" : "Not Admitted"}`);
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
  if (decisionDeny) decisionDeny.addEventListener("click", () => submitDecision("NOT_ADMIT"));

  loadQueue().catch(console.error);
})();
