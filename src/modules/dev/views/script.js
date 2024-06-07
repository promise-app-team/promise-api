document.addEventListener('DOMContentLoaded', () => {
  document.body.style.opacity = 0;
  setTimeout(() => (document.body.style.opacity = null), 30);
});
