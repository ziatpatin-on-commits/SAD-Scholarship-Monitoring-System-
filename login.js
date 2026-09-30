const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginBtn = document.getElementById("loginBtn");

function showLoginMessage(message, type="error") {
  loginMessage.textContent = message;
  loginMessage.className = `form-message show ${type}`;
}

async function checkExistingSession() {
  try {
    const { data } = await db.auth.getSession();
    if (data.session) window.location.href = "dashboard.html";
  } catch (error) {
    console.error(error);
  }
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginBtn.disabled = true;
  loginBtn.textContent = "Signing in...";
  loginMessage.className = "form-message";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
    window.location.href = "dashboard.html";
  } catch (error) {
    showLoginMessage(error.message || "Login failed. Check your email and password.");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Sign In";
  }
});

checkExistingSession();
