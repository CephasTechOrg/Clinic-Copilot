(function () {
  // API Base URL - auto-detect from current location
  const API_BASE = (window.location.protocol === 'file:' || !window.location.origin.includes('localhost')) 
    ? 'http://localhost:8000' 
    : window.location.origin;
  const LOGIN_URL = (window.location.protocol === 'file:') ? 'nurse_login.html' : "/nurse/login";
  
  console.log('[Nurse.js] Script loaded');
  
  // Check authentication
  if (typeof AUTH !== 'undefined') {
    if (!AUTH.requireRole('NURSE', LOGIN_URL)) {
      return; // Will redirect to login
    }
    console.log('[Nurse.js] Authenticated as:', AUTH.getUser()?.full_name);
    
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
  
  const queueList = document.getElementById("queue-list");
  const queueEmpty = document.getElementById("queue-empty");
  const queueSubtitle = document.getElementById("queue-subtitle");
  const vitalsLabel = document.getElementById("vitals-patient-label");
  const vitalsForm = document.getElementById("vitals-form");
  const errorEl = document.getElementById("vitals-error");
  const statWaiting = document.getElementById("stat-waiting");
  const statCompleted = document.getElementById("stat-completed");

  console.log('[Nurse.js] queueList element:', queueList ? 'Found' : 'NOT FOUND');
  console.log('[Nurse.js] vitalsForm element:', vitalsForm ? 'Found' : 'NOT FOUND');

  let selectedIntake = null;

  const priorityClass = (level) => {
    const norm = (level || "").toUpperCase();
    if (norm === "HIGH") return "priority-high";
    if (norm === "MED") return "priority-med";
    if (norm === "LOW") return "priority-low";
    return "";
  };

  const priorityBadgeClass = (level) => {
    const norm = (level || "NEW").toUpperCase();
    if (norm === "HIGH") return "bg-red-100 text-red-600 border border-red-200";
    if (norm === "MED") return "bg-amber-100 text-amber-600 border border-amber-200";
    if (norm === "LOW") return "bg-emerald-100 text-emerald-600 border border-emerald-200";
    return "bg-slate-100 text-slate-600 border border-slate-200";
  };

  const renderQueue = (items) => {
    if (!queueList) return;
    
    // Filter to show patients pending for nurse (awaiting vitals)
    // Use workflow_status OR has_vitals to determine pending status
    const pendingItems = items.filter(i => !i.has_vitals || i.workflow_status === 'PENDING_NURSE');
    const completedCount = items.filter(i => i.has_vitals && i.workflow_status !== 'PENDING_NURSE').length;
    
    if (statWaiting) statWaiting.textContent = pendingItems.length;
    if (statCompleted) statCompleted.textContent = completedCount;
    
    if (pendingItems.length === 0) {
      queueList.innerHTML = '';
      if (queueEmpty) queueEmpty.classList.remove('hidden');
      return;
    }
    
    if (queueEmpty) queueEmpty.classList.add('hidden');
    
    queueList.innerHTML = pendingItems
      .map((i, index) => {
        const priority = i.priority_level || "NEW";
        const isSelected = selectedIntake && selectedIntake.id === i.id;
        return `
          <div class="patient-card bg-white/80 backdrop-blur-sm p-4 rounded-xl border-2 ${isSelected ? 'selected border-teal-400' : 'border-white/50'} shadow-lg shadow-slate-200/30 ${priorityClass(priority)}" data-intake-id="${i.id}">
            <div class="flex items-start gap-3">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined text-slate-500 text-2xl">person</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="font-bold text-slate-800 truncate">${i.full_name}</h3>
                  <span class="text-xs font-bold px-2 py-1 rounded-full ${priorityBadgeClass(priority)} uppercase flex-shrink-0">${priority}</span>
                </div>
                <p class="text-sm text-slate-600 mt-0.5">${i.age} years old - ${i.sex || 'N/A'}</p>
                <p class="text-xs text-slate-500 mt-1 truncate"><span class="font-medium">CC:</span> ${i.chief_complaint}</p>
                <div class="flex items-center gap-2 mt-2">
                  <span class="material-symbols-outlined text-slate-400 text-xs">schedule</span>
                  <span class="text-xs text-slate-400">${i.created_at || 'Just now'}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  };

  const setSelected = (intake) => {
    selectedIntake = intake;
    if (vitalsLabel) {
      vitalsLabel.textContent = intake
        ? `Patient: ${intake.full_name}, ${intake.age} yrs`
        : "Select a patient from the queue";
    }
    // Re-render to show selection
    loadQueue();
  };

  const loadQueue = async () => {
    console.log('[Nurse.js] loadQueue called');
    try {
      const res = await fetch(API_BASE + "/api/intakes", {
        headers: getHeaders()
      });
      console.log('[Nurse.js] API response status:', res.status);
      
      // Handle auth errors
      if (res.status === 401) {
        if (typeof AUTH !== 'undefined') AUTH.clearAuth();
        window.location.href = LOGIN_URL;
        return;
      }
      
      const data = await res.json();
      console.log('[Nurse.js] API data:', data);
      const items = Array.isArray(data) ? data : data.items || [];
      console.log('[Nurse.js] Items count:', items.length);
      renderQueue(items);
      
      const pendingCount = items.filter(i => !i.has_summary).length;
      if (queueSubtitle) {
        queueSubtitle.textContent = `${pendingCount} patient${pendingCount !== 1 ? 's' : ''} awaiting vitals`;
      }

      const params = new URLSearchParams(window.location.search);
      const intakeId = params.get("intake_id");
      if (intakeId && !selectedIntake) {
        const found = items.find((i) => String(i.id) === String(intakeId));
        if (found) {
          selectedIntake = found;
          if (vitalsLabel) {
            vitalsLabel.textContent = `Patient: ${found.full_name}, ${found.age} yrs`;
          }
        }
      } else if (items.length > 0 && !selectedIntake) {
        const firstPending = items.find(i => !i.has_summary);
        if (firstPending) {
          selectedIntake = firstPending;
          if (vitalsLabel) {
            vitalsLabel.textContent = `Patient: ${firstPending.full_name}, ${firstPending.age} yrs`;
          }
        }
      }
    } catch (err) {
      console.error(err);
      if (queueSubtitle) queueSubtitle.textContent = "Unable to load queue.";
      if (window.showToast) {
        window.showToast('Connection Error', 'Unable to load patient queue', true);
      }
    }
  };

  if (queueList) {
    queueList.addEventListener("click", (e) => {
      const target = e.target.closest("[data-intake-id]");
      if (!target) return;
      const intakeId = target.getAttribute("data-intake-id");
      if (!intakeId) return;
      fetch(API_BASE + `/api/intakes/${encodeURIComponent(intakeId)}`, {
        headers: getHeaders()
      })
        .then((res) => {
          if (res.status === 401) {
            if (typeof AUTH !== 'undefined') AUTH.clearAuth();
            window.location.href = LOGIN_URL;
            return;
          }
          return res.json();
        })
        .then((intake) => { if (intake) setSelected(intake); })
        .catch((err) => console.error(err));
    });
  }

  if (vitalsForm) {
    vitalsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (errorEl) {
        errorEl.classList.add("hidden");
        errorEl.textContent = "";
      }
      if (!selectedIntake) {
        if (window.showToast) {
          window.showToast('No Patient Selected', 'Please select a patient from the queue first.', true);
        }
        if (errorEl) {
          errorEl.textContent = "Select a patient before submitting vitals.";
          errorEl.classList.remove("hidden");
        }
        return;
      }

      const formData = new FormData(vitalsForm);
      const payload = {
        heart_rate: Number(formData.get("heart_rate")),
        respiratory_rate: Number(formData.get("respiratory_rate")),
        temperature_c: Number(formData.get("temperature_c")),
        spo2: Number(formData.get("spo2")),
        systolic_bp: Number(formData.get("systolic_bp")),
        diastolic_bp: Number(formData.get("diastolic_bp")),
      };

      const submitBtn = document.getElementById("save-vitals");
      if (submitBtn) submitBtn.disabled = true;
      
      // Show loading overlay
      if (window.showLoading) window.showLoading();

      try {
        const res = await fetch(API_BASE + `/api/intakes/${selectedIntake.id}/vitals`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });
        
        // Handle auth errors
        if (res.status === 401) {
          if (typeof AUTH !== 'undefined') AUTH.clearAuth();
          window.location.href = LOGIN_URL;
          return;
        }
        
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || "Failed to save vitals");
        }
        
        if (window.hideLoading) window.hideLoading();
        
        if (window.showToast) {
          window.showToast('Success!', 'Vitals successfully sent to Doctor');
        }
        
        // Reset form and selection for next patient
        vitalsForm.reset();
        selectedIntake = null;
        if (vitalsLabel) {
          vitalsLabel.textContent = "Select a patient from the queue";
        }
        
        // Reload queue to show updated status
        await loadQueue();
        
        const submitBtn = document.getElementById("save-vitals");
        if (submitBtn) submitBtn.disabled = false;
        
      } catch (err) {
        if (window.hideLoading) window.hideLoading();
        if (window.showToast) {
          window.showToast('Error', 'Unable to save vitals. Please retry.', true);
        }
        if (errorEl) {
          errorEl.textContent = "Unable to save vitals. Please retry.";
          errorEl.classList.remove("hidden");
        }
        if (submitBtn) submitBtn.disabled = false;
        console.error(err);
      }
    });
  }

  loadQueue();
})();
