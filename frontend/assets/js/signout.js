// Helper function to delete a cookie
function deleteCookie(name) {
  document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

// Sign out function to delete the cookie and redirect
function signOut() {
  deleteCookie("userRole");
  // Redirect to the login page or home page
  window.location.href = "../index.html";
}

// // Function to get a cookie value by name
function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function getUserCookie(name) {
  let cookies = document.cookie.split("; ");
  for (let cookie of cookies) {
      let [key, value] = cookie.split("=");
      if (key === name) return value;
  }
  return null;
}
