(function () {
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

  const decisionAdmit = document.getElementById("decision-admit");
  const decisionDeny = document.getElementById("decision-deny");
  const decisionError = document.getElementById("decision-error");

  let currentIntakeId = null;

  const setPriority = (level) => {
    const norm = (level || "PENDING").toUpperCase();
    if (!priorityPill) return;
    priorityPill.textContent = norm;
    priorityPill.className =
      "text-xs font-semibold px-2 py-1 rounded-full " +
      (norm === "HIGH"
        ? "bg-red-100 text-red-600"
        : norm === "MED"
        ? "bg-amber-100 text-amber-600"
        : norm === "LOW"
        ? "bg-emerald-100 text-emerald-600"
        : "bg-slate-100 text-slate-600");
  };

  const renderList = (container, items) => {
    if (!container) return;
    if (!items || items.length === 0) {
      container.innerHTML = "<li class=\"text-slate-400\">-</li>";
      return;
    }
    container.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
  };

  const renderQueue = (items) => {
    if (!queue) return;
    queue.innerHTML = items
      .map(
        (i) => `
          <button class="text-left border border-slate-200 rounded-lg p-3 hover:bg-slate-50" data-id="${i.id}">
            <div class="font-semibold">${i.full_name}, ${i.age}</div>
            <div class="text-xs text-slate-500">${i.chief_complaint}</div>
            <div class="text-xs text-slate-400">${i.created_at}</div>
          </button>
        `
      )
      .join("");
  };

  const updateDetails = (data) => {
    currentIntakeId = data.id;
    if (patientName) {
      patientName.textContent = `${data.full_name}, ${data.age} ${data.sex || ""}`.trim();
    }
    if (patientMeta) patientMeta.textContent = `ID: #${data.id}`;
    if (chiefComplaint) chiefComplaint.textContent = data.chief_complaint || "-";
    if (aiSummary) aiSummary.textContent = data.clinical_summary?.short_summary || "-";

    setPriority(data.clinical_summary?.priority_level);

    if (vitalsSummary) {
      if (data.vitals) {
        vitalsSummary.textContent = `HR ${data.vitals.heart_rate} | RR ${data.vitals.respiratory_rate} | Temp ${data.vitals.temperature_c}C | SpO2 ${data.vitals.spo2}% | BP ${data.vitals.systolic_bp}/${data.vitals.diastolic_bp}`;
      } else {
        vitalsSummary.textContent = "-";
      }
    }

    renderList(redFlags, data.clinical_summary?.red_flags || []);
    renderList(differentialList, data.clinical_summary?.differential || []);
    renderList(nextSteps, data.clinical_summary?.recommended_next_steps || []);

    if (doctorNote) {
      doctorNote.value = data.clinical_summary?.doctor_note || "";
    }
  };

  const loadCase = async (id) => {
    const res = await fetch(`/api/intakes/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Failed to load case");
    const data = await res.json();
    updateDetails(data);
  };

  const loadQueue = async () => {
    const res = await fetch("/api/intakes");
    const data = await res.json();
    const items = Array.isArray(data) ? data : data.items || [];
    const ready = items.filter((i) => i.has_summary);

    renderQueue(ready);
    if (queueSubtitle) queueSubtitle.textContent = `${ready.length} cases ready for review`;
    if (queueEmpty) queueEmpty.classList.toggle("hidden", ready.length > 0);

    const params = new URLSearchParams(window.location.search);
    const intakeId = params.get("intake_id");
    if (intakeId && ready.find((i) => String(i.id) === String(intakeId))) {
      await loadCase(intakeId);
    } else if (ready.length > 0) {
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

  if (decisionAdmit) decisionAdmit.addEventListener("click", () => submitDecision("ADMIT"));
  if (decisionDeny) decisionDeny.addEventListener("click", () => submitDecision("NOT_ADMIT"));

  loadQueue().catch(console.error);
})();
