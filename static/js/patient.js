(function () {
  const form = document.getElementById("intake-form");
  const errorEl = document.getElementById("intake-error");
  const successEl = document.getElementById("intake-success");
  const submitBtn = document.getElementById("submit-intake");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errorEl) {
      errorEl.classList.add("hidden");
      errorEl.textContent = "";
    }
    if (successEl) {
      successEl.classList.add("hidden");
      successEl.textContent = "";
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
      severity: formData.get("severity")?.toString().trim(),
      history: formData.get("history")?.toString().trim() || "",
      medications: formData.get("medications")?.toString().trim() || "",
      allergies: formData.get("allergies")?.toString().trim() || "",
    };
    const requiredMissing = Object.entries({
      full_name: payload.full_name,
      age: payload.age,
      sex: payload.sex,
      address: payload.address,
      chief_complaint: payload.chief_complaint,
      symptoms: payload.symptoms,
      duration: payload.duration,
      severity: payload.severity,
    }).find(([, value]) => value === undefined || value === null || value === "" || Number.isNaN(value));
    if (requiredMissing) {
      if (errorEl) {
        errorEl.textContent = "Please complete all required fields.";
        errorEl.classList.remove("hidden");
      }
      return;
    }

    try {
      if (submitBtn) submitBtn.disabled = true;
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
      if (successEl) {
        successEl.textContent = "Submitted successfully. Redirecting to nurse...";
        successEl.classList.remove("hidden");
      }
      setTimeout(() => {
        window.location.href = `/nurse?intake_id=${encodeURIComponent(intakeId)}`;
      }, 600);
    } catch (err) {
      if (errorEl) {
        errorEl.textContent =
          "Unable to submit intake. Please check your fields and try again.";
        errorEl.classList.remove("hidden");
      }
      console.error(err);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();
