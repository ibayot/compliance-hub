// Some iOS versions reopen the page that was added instead of the manifest start URL.
if (navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
  window.location.replace('/dashboard');
}
