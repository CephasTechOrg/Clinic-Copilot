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
  const languageSelect = document.getElementById("language-select");

  const TRANSLATIONS = {
    en: {
      label_language: "Language",
      welcome_title: "Welcome to Your Visit",
      welcome_subtitle: "Please complete this form to help us understand your health concerns. All information is kept confidential.",
      section_personal_title: "Personal Information",
      section_personal_sub: "Your basic details",
      label_full_name: "Full Name",
      ph_full_name: "Enter your full name",
      label_age: "Age",
      ph_age: "Years",
      label_sex: "Sex",
      opt_select: "Select...",
      opt_female: "Female",
      opt_male: "Male",
      opt_other: "Other",
      opt_prefer_not: "Prefer not to say",
      label_address: "Address",
      ph_address: "Street address, City",
      section_symptoms_title: "Current Symptoms",
      section_symptoms_sub: "Tell us what brings you in today",
      label_chief_complaint: "Chief Complaint",
      ph_chief_complaint: "Main reason for your visit (e.g., headache, chest pain)",
      label_symptoms: "Describe Your Symptoms",
      ph_symptoms: "Please describe what you're experiencing in detail. Include when it started, what makes it better or worse, and any other relevant information...",
      label_duration: "Duration",
      ph_duration: "e.g., 2 days, 1 week",
      label_severity: "Pain/Severity",
      severity_mild: "Mild",
      severity_moderate: "Moderate",
      severity_severe: "Severe",
      section_history_title: "Medical History",
      section_history_sub: "Optional but helpful for your care",
      label_history: "Pre-existing Conditions",
      ph_history: "e.g., Diabetes, Hypertension, Asthma, Heart disease...",
      label_medications: "Current Medications",
      ph_medications: "List any medications, vitamins, or supplements you take regularly...",
      label_allergies: "Known Allergies",
      label_important: "Important",
      ph_allergies: "e.g., Penicillin, Aspirin, Latex, Peanuts...",
      privacy_notice: "Your information is encrypted and shared only with your healthcare team. We follow strict HIPAA privacy guidelines.",
      submit_header: "Submit",
      submit_button: "Submit to Healthcare Provider",
      required_note: "Fields marked with",
      required_note_suffix: "are required",
      success_title: "Successfully Submitted!",
      success_subtitle: "Your information has been sent to our nursing staff for review.",
      next_steps_title: "What happens next?",
      next_step_1: "A nurse will review your information and take your vitals",
      next_step_2: "Our AI assistant will prepare a clinical summary",
      next_step_3: "A doctor will review your case and provide recommendations",
      submit_another: "Submit Another Patient",
      submit_another_sub: "For a different patient or family member",
    },
    es: {
      label_language: "Idioma",
      welcome_title: "Bienvenido a su visita",
      welcome_subtitle: "Complete este formulario para ayudarnos a comprender su problema de salud. Toda la información es confidencial.",
      section_personal_title: "Información personal",
      section_personal_sub: "Sus datos básicos",
      label_full_name: "Nombre completo",
      ph_full_name: "Ingrese su nombre completo",
      label_age: "Edad",
      ph_age: "Años",
      label_sex: "Sexo",
      opt_select: "Seleccione...",
      opt_female: "Femenino",
      opt_male: "Masculino",
      opt_other: "Otro",
      opt_prefer_not: "Prefiero no decirlo",
      label_address: "Dirección",
      ph_address: "Calle y ciudad",
      section_symptoms_title: "Síntomas actuales",
      section_symptoms_sub: "Cuéntenos qué le trae hoy",
      label_chief_complaint: "Motivo principal",
      ph_chief_complaint: "Razón principal de su visita (p. ej., dolor de cabeza, dolor en el pecho)",
      label_symptoms: "Describa sus síntomas",
      ph_symptoms: "Describa en detalle lo que siente. Incluya cuándo empezó y qué lo mejora o empeora...",
      label_duration: "Duración",
      ph_duration: "p. ej., 2 días, 1 semana",
      label_severity: "Dolor/Gravedad",
      severity_mild: "Leve",
      severity_moderate: "Moderado",
      severity_severe: "Severo",
      section_history_title: "Historial médico",
      section_history_sub: "Opcional pero útil para su atención",
      label_history: "Enfermedades previas",
      ph_history: "p. ej., diabetes, hipertensión, asma, cardiopatías...",
      label_medications: "Medicamentos actuales",
      ph_medications: "Enumere medicamentos, vitaminas o suplementos que toma regularmente...",
      label_allergies: "Alergias conocidas",
      label_important: "Importante",
      ph_allergies: "p. ej., penicilina, aspirina, látex, cacahuetes...",
      privacy_notice: "Su información está cifrada y solo se comparte con su equipo médico. Seguimos estrictas normas de privacidad.",
      submit_header: "Enviar",
      submit_button: "Enviar al personal de salud",
      required_note: "Los campos marcados con",
      required_note_suffix: "son obligatorios",
      success_title: "¡Enviado con éxito!",
      success_subtitle: "Su información ha sido enviada al personal de enfermería para su revisión.",
      next_steps_title: "¿Qué sigue?",
      next_step_1: "Una enfermera revisará su información y tomará sus signos vitales",
      next_step_2: "Nuestro asistente de IA preparará un resumen clínico",
      next_step_3: "Un médico revisará su caso y dará recomendaciones",
      submit_another: "Enviar otro paciente",
      submit_another_sub: "Para otro paciente o familiar",
    },
    fr: {
      label_language: "Langue",
      welcome_title: "Bienvenue à votre visite",
      welcome_subtitle: "Veuillez remplir ce formulaire pour nous aider à comprendre votre problème de santé. Toutes les informations sont confidentielles.",
      section_personal_title: "Informations personnelles",
      section_personal_sub: "Vos informations de base",
      label_full_name: "Nom complet",
      ph_full_name: "Entrez votre nom complet",
      label_age: "Âge",
      ph_age: "Ans",
      label_sex: "Sexe",
      opt_select: "Sélectionnez...",
      opt_female: "Femme",
      opt_male: "Homme",
      opt_other: "Autre",
      opt_prefer_not: "Préfère ne pas dire",
      label_address: "Adresse",
      ph_address: "Rue, ville",
      section_symptoms_title: "Symptômes actuels",
      section_symptoms_sub: "Dites-nous ce qui vous amène aujourd'hui",
      label_chief_complaint: "Motif principal",
      ph_chief_complaint: "Raison principale de la visite (ex. mal de tête, douleur thoracique)",
      label_symptoms: "Décrivez vos symptômes",
      ph_symptoms: "Décrivez en détail ce que vous ressentez. Indiquez quand cela a commencé et ce qui améliore ou aggrave...",
      label_duration: "Durée",
      ph_duration: "ex. 2 jours, 1 semaine",
      label_severity: "Douleur/Gravité",
      severity_mild: "Léger",
      severity_moderate: "Modéré",
      severity_severe: "Sévère",
      section_history_title: "Antécédents médicaux",
      section_history_sub: "Optionnel mais utile pour vos soins",
      label_history: "Affections existantes",
      ph_history: "ex. diabète, hypertension, asthme...",
      label_medications: "Médicaments actuels",
      ph_medications: "Listez les médicaments, vitamines ou suppléments que vous prenez...",
      label_allergies: "Allergies connues",
      label_important: "Important",
      ph_allergies: "ex. pénicilline, aspirine, latex, arachides...",
      privacy_notice: "Vos informations sont chiffrées et partagées uniquement avec votre équipe soignante. Nous suivons des normes strictes de confidentialité.",
      submit_header: "Envoyer",
      submit_button: "Envoyer au personnel de santé",
      required_note: "Les champs marqués",
      required_note_suffix: "sont obligatoires",
      success_title: "Soumission réussie !",
      success_subtitle: "Vos informations ont été envoyées au personnel infirmier pour examen.",
      next_steps_title: "Et ensuite ?",
      next_step_1: "Une infirmière examinera vos informations et prendra vos signes vitaux",
      next_step_2: "Notre assistant IA préparera un résumé clinique",
      next_step_3: "Un médecin examinera votre dossier et fournira des recommandations",
      submit_another: "Soumettre un autre patient",
      submit_another_sub: "Pour un autre patient ou un membre de la famille",
    },
    ar: {
      label_language: "اللغة",
      welcome_title: "مرحبًا بزيارتك",
      welcome_subtitle: "يرجى تعبئة هذا النموذج لمساعدتنا على فهم مشكلتك الصحية. جميع المعلومات سرية.",
      section_personal_title: "المعلومات الشخصية",
      section_personal_sub: "بياناتك الأساسية",
      label_full_name: "الاسم الكامل",
      ph_full_name: "أدخل الاسم الكامل",
      label_age: "العمر",
      ph_age: "بالسنوات",
      label_sex: "الجنس",
      opt_select: "اختر...",
      opt_female: "أنثى",
      opt_male: "ذكر",
      opt_other: "أخرى",
      opt_prefer_not: "أفضل عدم القول",
      label_address: "العنوان",
      ph_address: "الشارع، المدينة",
      section_symptoms_title: "الأعراض الحالية",
      section_symptoms_sub: "أخبرنا بما يجعلك تأتي اليوم",
      label_chief_complaint: "الشكوى الرئيسية",
      ph_chief_complaint: "السبب الرئيسي للزيارة (مثل الصداع، ألم الصدر)",
      label_symptoms: "صف الأعراض",
      ph_symptoms: "يرجى وصف ما تشعر به بالتفصيل، ومتى بدأ، وما الذي يحسن أو يفاقم الأعراض...",
      label_duration: "المدة",
      ph_duration: "مثل يومين، أسبوع",
      label_severity: "الألم/الحدة",
      severity_mild: "خفيف",
      severity_moderate: "متوسط",
      severity_severe: "شديد",
      section_history_title: "التاريخ الطبي",
      section_history_sub: "اختياري لكنه مفيد لرعايتك",
      label_history: "الحالات السابقة",
      ph_history: "مثل السكري، ارتفاع الضغط، الربو...",
      label_medications: "الأدوية الحالية",
      ph_medications: "اذكر الأدوية أو الفيتامينات أو المكملات التي تتناولها...",
      label_allergies: "الحساسية المعروفة",
      label_important: "مهم",
      ph_allergies: "مثل البنسلين، الأسبرين، اللاتكس...",
      privacy_notice: "يتم تشفير معلوماتك ومشاركتها فقط مع فريق الرعاية. نتبع إرشادات صارمة للخصوصية.",
      submit_header: "إرسال",
      submit_button: "إرسال إلى مقدم الرعاية",
      required_note: "الحقول المميزة بـ",
      required_note_suffix: "مطلوبة",
      success_title: "تم الإرسال بنجاح!",
      success_subtitle: "تم إرسال معلوماتك إلى طاقم التمريض للمراجعة.",
      next_steps_title: "ماذا بعد؟",
      next_step_1: "ستقوم الممرضة بمراجعة معلوماتك وقياس العلامات الحيوية",
      next_step_2: "سيُعد مساعد الذكاء الاصطناعي ملخصًا سريريًا",
      next_step_3: "سيُراجع الطبيب حالتك ويقدم التوصيات",
      submit_another: "إرسال مريض آخر",
      submit_another_sub: "لمريض آخر أو لأحد أفراد الأسرة",
    },
    pt: {
      label_language: "Idioma",
      welcome_title: "Bem-vindo à sua visita",
      welcome_subtitle: "Preencha este formulário para nos ajudar a entender sua condição de saúde. Todas as informações são confidenciais.",
      section_personal_title: "Informações pessoais",
      section_personal_sub: "Seus dados básicos",
      label_full_name: "Nome completo",
      ph_full_name: "Digite seu nome completo",
      label_age: "Idade",
      ph_age: "Anos",
      label_sex: "Sexo",
      opt_select: "Selecione...",
      opt_female: "Feminino",
      opt_male: "Masculino",
      opt_other: "Outro",
      opt_prefer_not: "Prefiro não dizer",
      label_address: "Endereço",
      ph_address: "Rua, cidade",
      section_symptoms_title: "Sintomas atuais",
      section_symptoms_sub: "Conte-nos o que trouxe você hoje",
      label_chief_complaint: "Queixa principal",
      ph_chief_complaint: "Motivo principal da visita (ex.: dor de cabeça, dor no peito)",
      label_symptoms: "Descreva seus sintomas",
      ph_symptoms: "Descreva em detalhes o que você está sentindo. Inclua quando começou e o que melhora ou piora...",
      label_duration: "Duração",
      ph_duration: "ex.: 2 dias, 1 semana",
      label_severity: "Dor/Gravidade",
      severity_mild: "Leve",
      severity_moderate: "Moderada",
      severity_severe: "Severa",
      section_history_title: "Histórico médico",
      section_history_sub: "Opcional, mas útil para o atendimento",
      label_history: "Condições pré-existentes",
      ph_history: "ex.: diabetes, hipertensão, asma...",
      label_medications: "Medicamentos atuais",
      ph_medications: "Liste medicamentos, vitaminas ou suplementos que você usa...",
      label_allergies: "Alergias conhecidas",
      label_important: "Importante",
      ph_allergies: "ex.: penicilina, aspirina, látex, amendoim...",
      privacy_notice: "Suas informações são criptografadas e compartilhadas apenas com sua equipe de saúde. Seguimos diretrizes rigorosas de privacidade.",
      submit_header: "Enviar",
      submit_button: "Enviar ao profissional de saúde",
      required_note: "Os campos marcados com",
      required_note_suffix: "são obrigatórios",
      success_title: "Enviado com sucesso!",
      success_subtitle: "Suas informações foram enviadas à equipe de enfermagem para análise.",
      next_steps_title: "O que acontece agora?",
      next_step_1: "Uma enfermeira revisará suas informações e coletará seus sinais vitais",
      next_step_2: "Nosso assistente de IA preparará um resumo clínico",
      next_step_3: "Um médico revisará seu caso e fornecerá recomendações",
      submit_another: "Enviar outro paciente",
      submit_another_sub: "Para outro paciente ou familiar",
    },
  };

  const applyTranslations = (lang) => {
    const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (t[key]) el.textContent = t[key];
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (t[key]) el.setAttribute("placeholder", t[key]);
    });
    document.title = `Patient Intake - Clinic Co-Pilot`;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    if (document.body) {
      document.body.classList.toggle("rtl", lang === "ar");
    }
  };

  if (languageSelect) {
    applyTranslations(languageSelect.value);
    languageSelect.addEventListener("change", () => {
      applyTranslations(languageSelect.value);
    });
  }

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
      preferred_language: (languageSelect?.value || "en").toLowerCase(),
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
