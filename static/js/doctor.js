(function () {
  const patientName = document.getElementById("patient-name");
  const patientId = document.getElementById("patient-id");
  const priorityPill = document.getElementById("priority-pill");
  const chiefComplaint = document.getElementById("chief-complaint");
  const urgencyScore = document.getElementById("urgency-score");
  const urgencyLabel = document.getElementById("urgency-label");
  const aiSummary = document.getElementById("ai-summary");
  const redFlags = document.getElementById("red-flags");
  const differentialList = document.getElementById("differential-list");
  const nextSteps = document.getElementById("next-steps");
  const doctorNote = document.getElementById("doctor-note");
  const decisionAdmit = document.getElementById("decision-admit");
  const decisionDeny = document.getElementById("decision-deny");
  const decisionError = document.getElementById("decision-error");

  let currentIntakeId = null;

  const setPriority = (level) => {
    const norm = (level || "PENDING").toUpperCase();
    if (!priorityPill) return;
    priorityPill.textContent = norm;
    priorityPill.className =
      "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border " +
      (norm === "HIGH"
        ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
        : norm === "MED"
        ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800"
        : norm === "LOW"
        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700");

    if (urgencyScore && urgencyLabel) {
      const score = norm === "HIGH" ? 90 : norm === "MED" ? 60 : norm === "LOW" ? 30 : 0;
      urgencyScore.textContent = `${score}%`;
      urgencyLabel.textContent =
        norm === "HIGH" ? "CRITICAL RISK" : norm === "MED" ? "MODERATE RISK" : "LOW RISK";
    }
  };

  const renderList = (container, items, emptyText) => {
    if (!container) return;
    if (!items || items.length === 0) {
      container.innerHTML = `<div class="text-sm text-slate-400">${emptyText}</div>`;
      return;
    }
    container.innerHTML = items
      .map(
        (item) => `
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-red-500 text-sm">check_circle</span>
            <p class="text-sm font-medium">${item}</p>
          </div>
        `
      )
      .join("");
  };

  const renderDifferential = (items) => {
    if (!differentialList) return;
    if (!items || items.length === 0) {
      differentialList.innerHTML =
        '<div class="p-3 text-sm text-slate-400">No differential suggestions.</div>';
      return;
    }
    differentialList.innerHTML = items
      .map(
        (item) => `
          <div class="p-3 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="size-2 rounded-full bg-red-500"></div>
              <p class="text-sm font-semibold">${item}</p>
            </div>
            <span class="text-xs font-bold text-slate-400">AI</span>
          </div>
        `
      )
      .join("");
  };

  const renderNextSteps = (items) => {
    if (!nextSteps) return;
    if (!items || items.length === 0) {
      nextSteps.innerHTML = `<li class="flex gap-2"><span class="material-symbols-outlined text-sm">arrow_forward</span>No next steps.</li>`;
      return;
    }
    nextSteps.innerHTML = items
      .map(
        (item) => `
          <li class="flex gap-2">
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
            ${item}
          </li>
        `
      )
      .join("");
  };

  const loadCase = async (intakeId) => {
    const res = await fetch(`/api/intakes/${encodeURIComponent(intakeId)}`);
    if (!res.ok) throw new Error("Failed to load case");
    const data = await res.json();
    currentIntakeId = data.id;

    if (patientName) {
      patientName.textContent = `${data.full_name}, ${data.age}${data.sex ? data.sex[0] : ""}`;
    }
    if (patientId) patientId.textContent = `ID: #${data.id}`;
    if (chiefComplaint) {
      chiefComplaint.textContent = `Chief Complaint: ${data.chief_complaint || "-"}`;
    }
    if (aiSummary) {
      aiSummary.textContent = data.clinical_summary?.short_summary || "AI analysis pending.";
    }
    if (doctorNote && data.clinical_summary?.doctor_note) {
      doctorNote.value = data.clinical_summary.doctor_note;
    }

    setPriority(data.clinical_summary?.priority_level);
    renderList(
      redFlags,
      data.clinical_summary?.red_flags || [],
      "No red flags recorded."
    );
    renderDifferential(data.clinical_summary?.differential || []);
    renderNextSteps(data.clinical_summary?.recommended_next_steps || []);
  };

  const loadInitial = async () => {
    const params = new URLSearchParams(window.location.search);
    const intakeId = params.get("intake_id");
    if (intakeId) {
      await loadCase(intakeId);
      return;
    }
    const res = await fetch("/api/intakes");
    const data = await res.json();
    const items = Array.isArray(data) ? data : data.items || [];
    const first = items.find((i) => i.has_summary) || items[0];
    if (first) {
      await loadCase(first.id);
    }
  };

  const submitDecision = async (decision) => {
    if (!currentIntakeId) return;
    if (decisionError) {
      decisionError.classList.add("hidden");
      decisionError.textContent = "";
    }
    try {
      const res = await fetch(`/api/intakes/${currentIntakeId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          doctor_note: doctorNote ? doctorNote.value : "",
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Decision failed");
      }
    } catch (err) {
      if (decisionError) {
        decisionError.textContent = "Unable to save decision. Please retry.";
        decisionError.classList.remove("hidden");
      }
      console.error(err);
    }
  };

  if (decisionAdmit) {
    decisionAdmit.addEventListener("click", () => submitDecision("ADMIT"));
  }
  if (decisionDeny) {
    decisionDeny.addEventListener("click", () => submitDecision("NOT_ADMIT"));
  }

  loadInitial().catch((err) => console.error(err));
})();
