// Force dark mode immediately - runs before React hydrates
(function() {
  // Force dark mode immediately - runs before React hydrates
  document.documentElement.setAttribute('data-theme', 'dark');
  document.documentElement.setAttribute('data-radix-theme-appearance', 'dark');
  document.documentElement.style.colorScheme = 'dark';
  document.documentElement.style.backgroundColor = '#000000';
  
  // Override any system preference
  if (window.matchMedia) {
    // Force dark mode even if system prefers light
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }
  
  // Set meta tags immediately
  let meta = document.querySelector('meta[name="color-scheme"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'color-scheme';
    document.head.appendChild(meta);
  }
  meta.content = 'dark';
  
  let themeColor = document.querySelector('meta[name="theme-color"]');
  if (!themeColor) {
    themeColor = document.createElement('meta');
    themeColor.name = 'theme-color';
    document.head.appendChild(themeColor);
  }
  themeColor.content = '#000000';
  
  let appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (!appleStatusBar) {
    appleStatusBar = document.createElement('meta');
    appleStatusBar.name = 'apple-mobile-web-app-status-bar-style';
    document.head.appendChild(appleStatusBar);
  }
  appleStatusBar.content = 'black-translucent';
})();

