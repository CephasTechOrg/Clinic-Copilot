(function () {
  const form = document.getElementById("intake-form");
  const errorEl = document.getElementById("intake-error");
  const severityRange = document.getElementById("severity");
  const severityDisplay = document.getElementById("severity-display");

  if (severityRange && severityDisplay) {
    const updateSeverity = () => {
      severityDisplay.textContent = `${severityRange.value}/10`;
    };
    severityRange.addEventListener("input", updateSeverity);
    updateSeverity();
  }

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errorEl) {
      errorEl.classList.add("hidden");
      errorEl.textContent = "";
    }

    const formData = new FormData(form);
    const payload = {
      full_name: formData.get("full_name")?.toString().trim(),
      age: Number(formData.get("age")),
      sex: formData.get("sex")?.toString().trim(),
      address: formData.get("address")?.toString().trim(),
      chief_complaint: formData.get("chief_complaint")?.toString().trim(),
      symptoms: formData.get("symptoms")?.toString().trim(),
      duration: formData.get("duration")?.toString().trim(),
      severity: `${formData.get("severity")}/10`,
      history: formData.get("history")?.toString().trim() || "",
      medications: formData.get("medications")?.toString().trim() || "",
      allergies: formData.get("allergies")?.toString().trim() || "",
    };

    try {
      const res = await fetch("/api/intakes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to submit intake");
      }

      const data = await res.json();
      const intakeId = data.id;
      window.location.href = `/nurse?intake_id=${encodeURIComponent(intakeId)}`;
    } catch (err) {
      if (errorEl) {
        errorEl.textContent =
          "Unable to submit intake. Please check your fields and try again.";
        errorEl.classList.remove("hidden");
      }
      console.error(err);
    }
  });
})();
