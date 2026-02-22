(function () {
  const queueList = document.getElementById("queue-list");
  const queueEmpty = document.getElementById("queue-empty");
  const queueSubtitle = document.getElementById("queue-subtitle");
  const vitalsLabel = document.getElementById("vitals-patient-label");
  const vitalsForm = document.getElementById("vitals-form");
  const errorEl = document.getElementById("vitals-error");

  let selectedIntake = null;

  const priorityBadge = (level) => {
    const norm = (level || "PENDING").toUpperCase();
    if (norm === "HIGH") return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
    if (norm === "MED") return "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
    if (norm === "LOW") return "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400";
    return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  };

  const renderQueue = (items) => {
    if (!queueList) return;
    queueList.innerHTML = items
      .map((i) => {
        const priority = i.priority_level || (i.has_summary ? "PENDING" : "NEW");
        return `
          <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-slate-400">person</span>
              </div>
              <div>
                <h3 class="font-bold text-slate-900 dark:text-white">${i.full_name}, ${i.age}</h3>
                <p class="text-xs text-slate-500 mb-1">Chief Complaint: <span class="text-slate-700 dark:text-slate-300 font-medium">${i.chief_complaint}</span></p>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] ${priorityBadge(priority)} px-2 py-0.5 rounded font-bold uppercase tracking-tight">${priority}</span>
                  <span class="text-[10px] text-slate-400 flex items-center gap-1"><span class="material-symbols-outlined text-xs">schedule</span>${i.created_at || "now"}</span>
                </div>
              </div>
            </div>
            <button class="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm hover:bg-primary/90 transition-all flex items-center gap-2" data-intake-id="${i.id}">
              <span class="material-symbols-outlined text-sm">add_circle</span>
              Vitals
            </button>
          </div>
        `;
      })
      .join("");
  };

  const setSelected = (intake) => {
    selectedIntake = intake;
    if (vitalsLabel) {
      vitalsLabel.textContent = intake
        ? `Patient: ${intake.full_name}, ${intake.age}`
        : "Patient: -";
    }
  };

  const loadQueue = async () => {
    try {
      const res = await fetch("/api/intakes");
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.items || [];
      renderQueue(items);
      if (queueSubtitle) {
        queueSubtitle.textContent = `${items.length} patients awaiting triage/vitals`;
      }
      if (queueEmpty) {
        queueEmpty.classList.toggle("hidden", items.length > 0);
      }

      const params = new URLSearchParams(window.location.search);
      const intakeId = params.get("intake_id");
      if (intakeId) {
        const found = items.find((i) => String(i.id) === String(intakeId));
        if (found) setSelected(found);
      } else if (items.length > 0) {
        setSelected(items[0]);
      }
    } catch (err) {
      console.error(err);
      if (queueSubtitle) queueSubtitle.textContent = "Unable to load queue.";
    }
  };

  if (queueList) {
    queueList.addEventListener("click", (e) => {
      const target = e.target.closest("[data-intake-id]");
      if (!target) return;
      const intakeId = target.getAttribute("data-intake-id");
      if (!intakeId) return;
      fetch(`/api/intakes/${encodeURIComponent(intakeId)}`)
        .then((res) => res.json())
        .then((intake) => setSelected(intake))
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

      try {
        const res = await fetch(`/api/intakes/${selectedIntake.id}/vitals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || "Failed to save vitals");
        }
        window.location.href = `/doctor?intake_id=${encodeURIComponent(selectedIntake.id)}`;
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = "Unable to save vitals. Please retry.";
          errorEl.classList.remove("hidden");
        }
        console.error(err);
      }
    });
  }

  loadQueue();
})();
