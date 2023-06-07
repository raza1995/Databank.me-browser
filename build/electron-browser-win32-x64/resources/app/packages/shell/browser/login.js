// Selecting the login form and button
const loginForm = document.querySelector('#login-form');
const loginButton = document.querySelector('#login-form button');

// Adding an event listener to the login form
loginForm.addEventListener('submit', (e) => {
  e.preventDefault(); // Preventing the default form submission

  // Getting the user's input values
  const username = loginForm.username.value;
  const password = loginForm.password.value;

  // Checking if the username and password are valid
  if (username === 'myusername' && password === 'mypassword') {
    alert('Login successful!');
    window.location.href = '/home.html'; // Redirecting to the home page
  } else {
    alert('Invalid username or password. Please try again.');
  }
});
