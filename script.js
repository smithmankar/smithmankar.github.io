function checkPassword() {
    const password = document.getElementById("password-input").value;
    const correctPassword = "1234"; // CHANGE THIS to your date/code

    if (password === correctPassword) {
        document.getElementById("login-overlay").style.display = "none";
        document.getElementById("main-content").style.display = "block";
    } else {
        document.getElementById("error-msg").innerText = "Wrong date. Try again.";
        document.getElementById("error-msg").style.color = "red";
    }
}
