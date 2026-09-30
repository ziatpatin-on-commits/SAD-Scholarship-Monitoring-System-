let currentUser = null;
let currentProfile = null;
let scholars = [];
let programs = [];
let submissions = [];

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const { data, error } = await db.auth.getSession();
    if (error || !data.session) {
      window.location.href = "index.html";
      return;
    }
    currentUser = data.session.user;
    await loadProfile();
    setupUI();
    await refreshAll();
  } catch (error) {
    console.error(error);
    toast(error.message || "Unable to load application.", "error");
  }
}

async function loadProfile() {
  const { data, error } = await db.from("profiles").select("*").eq("id", currentUser.id).single();
  if (error) {
    console.error(error);
    currentProfile = { id: currentUser.id, full_name: currentUser.email, role: "staff" };
    return;
  }
  currentProfile = data;
}

function setupUI() {
  const name = currentProfile?.full_name || currentUser.email;
  $("userName").textContent = name;
  $("userRole").textContent = (currentProfile?.role || "staff").toUpperCase();
  $("userAvatar").textContent = name.charAt(0).toUpperCase();

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => switchSection(btn.dataset.section));
  });
  $("refreshBtn").addEventListener("click", refreshAll);
  $("logoutBtn").addEventListener("click", logout);

  $("addScholarBtn").addEventListener("click", () => openScholarModal());
  $("addProgramBtn").addEventListener("click", () => openProgramModal());
  $("addGradeBtn").addEventListener("click", () => openGradeModal());

  $("scholarForm").addEventListener("submit", saveScholar);
  $("programForm").addEventListener("submit", saveProgram);
  $("gradeForm").addEventListener("submit", saveGrade);

  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => closeModal(btn.dataset.close));
  });
  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("show"); });
  });

  $("scholarSearch").addEventListener("input", renderScholars);
  $("scholarStatusFilter").addEventListener("change", renderScholars);
  $("scholarProgramFilter").addEventListener("change", renderScholars);
  $("gradeStatusFilter").addEventListener("change", renderGrades);
  $("complianceSearch").addEventListener("input", renderCompliance);
  $("complianceFilter").addEventListener("change", renderCompliance);
}

function switchSection(section) {
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.section === section));
  document.querySelectorAll(".content-section").forEach(s => s.classList.toggle("active", s.id === `${section}-section`));
  const titles = { dashboard:"Dashboard", scholars:"Scholars", programs:"Scholarship Programs", grades:"Grade Submissions", compliance:"Compliance Monitoring" };
  $("pageTitle").textContent = titles[section] || "Dashboard";
}

async function refreshAll() {
  $("connectionBadge").textContent = "Loading...";
  try {
    await Promise.all([loadPrograms(), loadScholars(), loadSubmissions()]);
    renderAll();
    $("connectionBadge").textContent = "Database Connected";
    $("connectionBadge").className = "badge badge-green";
  } catch (error) {
    console.error(error);
    $("connectionBadge").textContent = "Database Error";
    $("connectionBadge").className = "badge badge-red";
    toast(error.message || "Could not load data.", "error");
  }
}

async function loadPrograms() {
  const { data, error } = await db.from("scholarship_programs").select("*").order("program_name");
  if (error) throw error;
  programs = data || [];
}

async function loadScholars() {
  const { data, error } = await db.from("scholars").select("*, scholarship_programs(id, program_name)").order("full_name");
  if (error) throw error;
  scholars = data || [];
}

async function loadSubmissions() {
  const { data, error } = await db.from("grade_submissions")
    .select("*, scholars(id, student_id, full_name, scholarship_id, status, scholarship_programs(id, program_name, required_gwa, min_units, allow_failing))")
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  submissions = data || [];
}

function renderAll() {
  renderDashboard();
  renderScholars();
  renderPrograms();
  renderGrades();
  renderCompliance();
  populateScholarOptions();
  populateProgramFilters();
}

function renderDashboard() {
  const pending = submissions.filter(s => s.submission_status === "Pending").length;
  const verified = submissions.filter(s => s.submission_status === "Verified").length;
  const compliant = scholars.filter(s => s.status === "Compliant").length;
  const deficiency = scholars.filter(s => s.status === "With Deficiency").length;

  $("statScholars").textContent = scholars.length;
  $("statPending").textContent = pending;
  $("statVerified").textContent = verified;
  $("statCompliant").textContent = compliant;
  $("statDeficiency").textContent = deficiency;

  const recent = submissions.slice(0, 6);
  $("recentSubmissions").innerHTML = recent.length ? `
    <table class="data-table"><thead><tr><th>Scholar</th><th>Semester</th><th>GWA</th><th>Status</th></tr></thead>
    <tbody>${recent.map(s => `<tr>
      <td><strong>${esc(s.scholars?.full_name)}</strong><br><small>${esc(s.scholars?.student_id)}</small></td>
      <td>${esc(s.academic_year)} / ${esc(s.semester)}</td>
      <td>${num(s.gwa)}</td>
      <td>${statusBadge(s.submission_status)}</td>
    </tr>`).join("")}</tbody></table>` : `<div class="empty">No grade submissions yet.</div>`;

  const counts = {
    "Active": scholars.filter(s=>s.status==="Active").length,
    "Compliant": compliant,
    "With Deficiency": deficiency,
    "Pending Submission": scholars.filter(s=>s.status==="Pending Submission").length,
    "For Renewal": scholars.filter(s=>s.status==="For Renewal").length
  };
  const total = Math.max(scholars.length, 1);
  $("statusSummary").innerHTML = Object.entries(counts).map(([label,count]) => `
    <div class="status-row"><div class="status-label"><span>${label}</span><strong>${count}</strong></div>
    <div class="progress"><i style="width:${Math.round(count/total*100)}%"></i></div></div>`).join("");
}

function renderScholars() {
  const search = ($("scholarSearch").value || "").toLowerCase().trim();
  const status = $("scholarStatusFilter").value;
  const program = $("scholarProgramFilter").value;

  const rows = scholars.filter(s => {
    const matchesSearch = !search || `${s.student_id} ${s.full_name}`.toLowerCase().includes(search);
    const matchesStatus = !status || s.status === status;
    const matchesProgram = !program || String(s.scholarship_id) === program;
    return matchesSearch && matchesStatus && matchesProgram;
  });

  $("scholarsTable").innerHTML = rows.length ? `
    <table class="data-table"><thead><tr><th>Student</th><th>Degree Program</th><th>Year</th><th>Scholarship</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${rows.map(s => `<tr>
      <td><strong>${esc(s.full_name)}</strong><br><small>${esc(s.student_id)}</small></td>
      <td>${esc(s.degree_program)}</td><td>${esc(s.year_level)}</td>
      <td>${esc(s.scholarship_programs?.program_name || "—")}</td>
      <td>${statusBadge(s.status)}</td>
      <td class="actions"><button class="btn btn-small btn-primary" onclick="openScholarModal('${s.id}')">Edit</button></td>
    </tr>`).join("")}</tbody></table>` : `<div class="empty">No scholars match your search/filter.</div>`;
}

function renderPrograms() {
  $("programsTable").innerHTML = programs.length ? `
    <table class="data-table"><thead><tr><th>Program</th><th>Required GWA</th><th>Min Units</th><th>Failing Grades</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${programs.map(p => `<tr>
      <td><strong>${esc(p.program_name)}</strong></td><td>${num(p.required_gwa)}</td><td>${p.min_units}</td>
      <td>${p.allow_failing ? "Allowed" : "Not allowed"}</td>
      <td>${p.active ? statusBadge("Active") : statusBadge("Inactive")}</td>
      <td><button class="btn btn-small btn-primary" onclick="openProgramModal('${p.id}')">Edit</button></td>
    </tr>`).join("")}</tbody></table>` : `<div class="empty">No scholarship programs yet. Add one to begin.</div>`;
}

function renderGrades() {
  const filter = $("gradeStatusFilter").value;
  const rows = submissions.filter(s => !filter || s.submission_status === filter);
  $("gradesTable").innerHTML = rows.length ? `
    <table class="data-table"><thead><tr><th>Scholar</th><th>Academic Period</th><th>GWA</th><th>Units</th><th>Failed</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${rows.map(s => `<tr>
      <td><strong>${esc(s.scholars?.full_name)}</strong><br><small>${esc(s.scholars?.student_id)}</small></td>
      <td>${esc(s.academic_year)}<br>${esc(s.semester)}</td><td>${num(s.gwa)}</td><td>${s.units_enrolled}</td><td>${s.failed_subjects}</td>
      <td>${statusBadge(s.submission_status)}</td>
      <td class="actions">${s.submission_status === "Pending" && canVerify() ? `<button class="btn btn-small btn-success" onclick="verifySubmission('${s.id}')">Verify</button>` : ""}
      ${s.submission_status === "Pending" && canVerify() ? `<button class="btn btn-small btn-danger" onclick="returnSubmission('${s.id}')">Return</button>` : ""}</td>
    </tr>`).join("")}</tbody></table>` : `<div class="empty">No grade submissions found.</div>`;
}

function renderCompliance() {
  const search = ($("complianceSearch").value || "").toLowerCase().trim();
  const filter = $("complianceFilter").value;
  const latest = new Map();
  submissions.filter(s => s.submission_status === "Verified").forEach(s => {
    const existing = latest.get(s.scholar_id);
    if (!existing || new Date(s.submitted_at) > new Date(existing.submitted_at)) latest.set(s.scholar_id, s);
  });
  let rows = [...latest.values()];
  rows = rows.filter(s => {
    const result = getCompliance(s);
    const q = `${s.scholars?.full_name} ${s.scholars?.student_id}`.toLowerCase();
    return (!search || q.includes(search)) && (!filter || result.status === filter);
  });

  $("complianceTable").innerHTML = rows.length ? `
    <table class="data-table"><thead><tr><th>Scholar</th><th>Program</th><th>GWA</th><th>Units</th><th>Failed</th><th>Evaluation</th><th>Reason</th></tr></thead>
    <tbody>${rows.map(s => { const r = getCompliance(s); return `<tr>
      <td><strong>${esc(s.scholars?.full_name)}</strong><br><small>${esc(s.scholars?.student_id)}</small></td>
      <td>${esc(s.scholars?.scholarship_programs?.program_name || "—")}</td>
      <td>${num(s.gwa)} / max ${num(s.scholars?.scholarship_programs?.required_gwa)}</td>
      <td>${s.units_enrolled} / min ${s.scholars?.scholarship_programs?.min_units}</td>
      <td>${s.failed_subjects}</td><td>${statusBadge(r.status)}</td><td>${esc(r.reason)}</td>
    </tr>`; }).join("")}</tbody></table>` : `<div class="empty">No verified compliance evaluations match your filter.</div>`;
}

function getCompliance(s) {
  const p = s.scholars?.scholarship_programs;
  if (!p) return {status:"With Deficiency", reason:"No scholarship requirement found."};
  const gwaOK = Number(s.gwa) <= Number(p.required_gwa);
  const unitsOK = Number(s.units_enrolled) >= Number(p.min_units);
  const failingOK = p.allow_failing || Number(s.failed_subjects) === 0;
  const incompleteOK = Number(s.incomplete_subjects) === 0;
  if (gwaOK && unitsOK && failingOK && incompleteOK) return {status:"Compliant", reason:"All required conditions satisfied."};
  const reasons = [];
  if (!gwaOK) reasons.push("GWA requirement");
  if (!unitsOK) reasons.push("minimum units");
  if (!failingOK) reasons.push("failing-grade policy");
  if (!incompleteOK) reasons.push("incomplete subjects");
  return {status:"With Deficiency", reason:reasons.join(", ")};
}

function populateProgramFilters() {
  $("scholarProgramFilter").innerHTML = `<option value="">All Programs</option>` + programs.map(p => `<option value="${p.id}">${esc(p.program_name)}</option>`).join("");
  $("scholarStatusFilter").innerHTML = `<option value="">All Statuses</option>` + ["Active","Pending Submission","For Verification","Compliant","With Deficiency","Probationary","For Renewal","Renewed","Disqualified"].map(s => `<option>${s}</option>`).join("");
}

function populateScholarOptions() {
  $("gradeScholarId").innerHTML = `<option value="">Select scholar</option>` + scholars.map(s => `<option value="${s.id}">${esc(s.student_id)} — ${esc(s.full_name)}</option>`).join("");
}

function openScholarModal(id=null) {
  $("scholarForm").reset(); $("scholarId").value = "";
  $("scholarModalTitle").textContent = id ? "Edit Scholar" : "Add Scholar";
  $("scholarshipId").innerHTML = `<option value="">Select program</option>` + programs.filter(p=>p.active).map(p => `<option value="${p.id}">${esc(p.program_name)}</option>`).join("");
  if (id) {
    const s = scholars.find(x => x.id === id); if (!s) return;
    $("scholarId").value=s.id; $("studentId").value=s.student_id; $("fullName").value=s.full_name;
    $("degreeProgram").value=s.degree_program; $("yearLevel").value=s.year_level; $("scholarshipId").value=s.scholarship_id; $("scholarStatus").value=s.status;
  }
  showModal("scholarModal");
}

async function saveScholar(e) {
  e.preventDefault();
  const id = $("scholarId").value;
  const payload = {student_id:$("studentId").value.trim(),full_name:$("fullName").value.trim(),degree_program:$("degreeProgram").value.trim(),year_level:$("yearLevel").value,scholarship_id:$("scholarshipId").value,status:$("scholarStatus").value};
  if (!payload.student_id) return toast("Student ID cannot be blank.", "error");
  try {
    const query = id ? db.from("scholars").update(payload).eq("id", id) : db.from("scholars").insert(payload);
    const {error}=await query; if(error) throw error;
    closeModal("scholarModal"); toast(id?"Scholar updated.":"Scholar created.","success"); await refreshAll();
  } catch(error){ toast(error.message,"error"); }
}

function openProgramModal(id=null) {
  $("programForm").reset(); $("programId").value=""; $("programModalTitle").textContent=id?"Edit Scholarship Program":"Add Scholarship Program";
  $("programActive").value="true";
  if(id){const p=programs.find(x=>x.id===id); if(!p)return; $("programId").value=p.id;$("programName").value=p.program_name;$("requiredGwa").value=p.required_gwa;$("minUnits").value=p.min_units;$("allowFailing").checked=p.allow_failing;$("programActive").value=String(p.active);}
  showModal("programModal");
}

async function saveProgram(e){
  e.preventDefault();
  const id=$("programId").value;
  const payload={program_name:$("programName").value.trim(),required_gwa:Number($("requiredGwa").value),min_units:Number($("minUnits").value),allow_failing:$("allowFailing").checked,active:$("programActive").value==="true"};
  if(!payload.program_name || payload.required_gwa<0 || payload.min_units<0)return toast("Please enter valid scholarship requirements.","error");
  try{const q=id?db.from("scholarship_programs").update(payload).eq("id",id):db.from("scholarship_programs").insert(payload);const{error}=await q;if(error)throw error;closeModal("programModal");toast(id?"Program updated.":"Program created.","success");await refreshAll();}catch(error){toast(error.message,"error");}
}

function openGradeModal(){ $("gradeForm").reset(); $("failedSubjects").value=0;$("incompleteSubjects").value=0;populateScholarOptions();showModal("gradeModal"); }

async function saveGrade(e){
  e.preventDefault();
  const payload={scholar_id:$("gradeScholarId").value,academic_year:$("academicYear").value.trim(),semester:$("semester").value,gwa:Number($("gwa").value),units_enrolled:Number($("unitsEnrolled").value),failed_subjects:Number($("failedSubjects").value),incomplete_subjects:Number($("incompleteSubjects").value),submission_status:"Pending"};
  if(!payload.scholar_id)return toast("Select a scholar.","error");
  if(payload.gwa<0 || payload.gwa>100 || payload.units_enrolled<0 || payload.failed_subjects<0 || payload.incomplete_subjects<0)return toast("Enter valid non-negative academic values.","error");
  try{const{error}=await db.from("grade_submissions").insert(payload);if(error)throw error;closeModal("gradeModal");toast("Grade submission saved as Pending.","success");await refreshAll();}catch(error){toast(error.message,"error");}
}

async function verifySubmission(id){
  if(!canVerify())return toast("Only authorized staff/admin users may verify submissions.","error");
  if(!confirm("Verify this submission? The system will then evaluate compliance."))return;
  try{
    const {data,error}=await db.rpc("verify_grade_submission",{p_submission_id:id});
    if(error)throw error;
    toast(data?.message || "Submission verified and evaluated.","success");
    await refreshAll();
  }catch(error){toast(error.message,"error");}
}
async function returnSubmission(id){
  if(!canVerify())return;
  if(!confirm("Return this submission for correction?"))return;
  try{const{error}=await db.from("grade_submissions").update({submission_status:"Returned"}).eq("id",id);if(error)throw error;toast("Submission returned.","info");await refreshAll();}catch(error){toast(error.message,"error");}
}
function canVerify(){return ["admin","staff"].includes(currentProfile?.role);}
async function logout(){await db.auth.signOut();window.location.href="index.html";}
function showModal(id){$(id).classList.add("show")}
function closeModal(id){$(id).classList.remove("show")}
function statusBadge(status){const cls={Active:"green",Verified:"green",Compliant:"green","Pending Submission":"amber",Pending:"amber","For Verification":"amber","With Deficiency":"red",Returned:"red",Disqualified:"red",Probationary:"purple","For Renewal":"blue",Renewed:"green",Inactive:"neutral"}[status]||"neutral";return `<span class="badge badge-${cls}">${esc(status)}</span>`}
function num(v){return Number(v).toFixed(2)}
function esc(value){return String(value??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function toast(message,type="info"){const el=$("toast");el.textContent=message;el.className=`toast show ${type}`;clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.className="toast",3500)}
