// Loads the Google Picker script chain and opens a spreadsheet picker.
// Resolves with the picked document ({ id, name }) or null when cancelled.

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });
}

async function ensurePickerLoaded() {
  if (window.gapi && window.google?.picker) return;
  if (!window.gapi) await loadScript('https://apis.google.com/js/api.js');
  await new Promise((resolve) => window.gapi.load('picker', { callback: resolve }));
  if (!window.google?.accounts) {
    await loadScript('https://accounts.google.com/gsi/client');
  }
}

export async function openSpreadsheetPicker(oauthToken) {
  await ensurePickerLoaded();

  return new Promise((resolve) => {
    const view = new window.google.picker.View(window.google.picker.ViewId.SPREADSHEETS);
    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(oauthToken)
      .setCallback((data) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const doc = data.docs[0];
          resolve({ id: doc.id, name: doc.name });
        } else if (data.action === window.google.picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build();
    picker.setVisible(true);
  });
}
