(function () {
  // API Base URL - auto-detect from current location
  const API_BASE = (window.location.protocol === 'file:' || !window.location.origin.includes('localhost')) 
    ? 'http://localhost:8000' 
    : window.location.origin;
  
  console.log('[Patient.js] Script loaded');
  
  const form = document.getElementById("intake-form");
  const errorEl = document.getElementById("intake-error");
  const successEl = document.getElementById("intake-success");
  const submitBtn = document.getElementById("submit-intake");

  console.log('[Patient.js] Form element:', form ? 'Found' : 'NOT FOUND');
  console.log('[Patient.js] Submit button:', submitBtn ? 'Found' : 'NOT FOUND');

  if (!form) {
    console.error('[Patient.js] Form not found - exiting');
    return;
  }

  form.addEventListener("submit", async (e) => {
    console.log('[Patient.js] Form submitted');
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
    const severityValue = formData.get("severity")?.toString().trim();
    const payload = {
      full_name: formData.get("full_name")?.toString().trim(),
      age: Number(formData.get("age")),
      sex: formData.get("sex")?.toString().trim(),
      address: formData.get("address")?.toString().trim(),
      chief_complaint: formData.get("chief_complaint")?.toString().trim(),
      symptoms: formData.get("symptoms")?.toString().trim(),
      duration: formData.get("duration")?.toString().trim(),
      severity: severityValue.includes('/') ? severityValue : severityValue + "/10",
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
      console.log('[Patient.js] Sending to API:', API_BASE + '/api/intakes');
      
      const res = await fetch(API_BASE + "/api/intakes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to submit intake");
      }

      const data = await res.json();
      console.log('[Patient.js] API response:', data);
      
      // Remove loading state from buttons
      document.querySelectorAll('.btn-loading').forEach(btn => btn.classList.remove('btn-loading'));
      
      // Show success screen if available, otherwise show toast
      if (window.showSuccessScreen) {
        window.showSuccessScreen();
      } else if (window.showToast) {
        window.showToast('Success!', 'Data successfully submitted to Nurse');
      }
      
      // Reset the form for next patient
      form.reset();
      
      // Update progress bar if exists
      const progressBar = document.getElementById('progress-bar');
      const progressText = document.getElementById('progress-text');
      if (progressBar) progressBar.style.width = '0%';
      if (progressText) progressText.textContent = '0%';
      
      // Reset severity display
      const severityDisplay = document.getElementById('severity-display');
      if (severityDisplay) severityDisplay.textContent = '5/10';
      
      // Show success message in the page as well
      if (successEl) {
        successEl.textContent = "Patient intake submitted successfully! The nurse will see this data when they load their portal.";
        successEl.classList.remove("hidden");
      }
      
    } catch (err) {
      console.error('[Patient.js] Error:', err);
      // Remove loading state from buttons on error
      document.querySelectorAll('.btn-loading').forEach(btn => btn.classList.remove('btn-loading'));
      if (window.showToast) {
        window.showToast('Submission Failed', 'Please check your connection and try again.', true);
      }
      if (errorEl) {
        errorEl.textContent =
          "Unable to submit intake. Please check your connection and try again.";
        errorEl.classList.remove("hidden");
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();
