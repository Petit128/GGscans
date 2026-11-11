let scanImages = [];
let pageUrl = "";

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  pageUrl = tab.url;
  
  document.getElementById('loading').style.display = 'block';

  // On injecte le script d'analyse
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['src/content/content.js']
  }, () => {
    // Puis on demande les donnÃ©es (le script va scroller et attendre)
    chrome.tabs.sendMessage(tab.id, { action: "getScanData" }, (response) => {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('mainUI').style.display = 'block';

      if (chrome.runtime.lastError || !response) {
        document.getElementById('info').textContent = "Erreur de communication avec la page.";
        return;
      }

      scanImages = response.urls || [];
      updateUI();
    });
  });
});

function updateUI() {
  const info = document.getElementById('info');
  const list = document.getElementById('list');
  const btn = document.getElementById('btnDownload');
  
  if (scanImages.length === 0) {
    info.textContent = "Aucune image detectee.";
    list.innerHTML = '<div class="empty">Essaie de scroller manuellement la page puis relance.</div>';
    btn.disabled = true;
    return;
  }

  info.textContent = `${scanImages.length} image(s) trouvee(s) au total.`;
  btn.disabled = false;
  
  list.innerHTML = '';
  scanImages.forEach((url, index) => {
    const div = document.createElement('div');
    div.className = 'item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.dataset.index = index;
    const mini = document.createElement('img');
    mini.src = url;
    const label = document.createElement('label');
    label.textContent = `Image ${index + 1}`;
    label.prepend(cb);
    div.appendChild(mini);
    div.appendChild(label);
    list.appendChild(div);
  });
}

document.getElementById('rangeQuality').addEventListener('input', (e) => {
  document.getElementById('lblQuality').textContent = e.target.value + '%';
});
document.getElementById('btnSelectAll').addEventListener('click', () => {
  document.querySelectorAll('#list input[type="checkbox"]').forEach(cb => cb.checked = true);
});
document.getElementById('btnSelectNone').addEventListener('click', () => {
  document.querySelectorAll('#list input[type="checkbox"]').forEach(cb => cb.checked = false);
});

document.getElementById('btnDownload').addEventListener('click', () => {
  const urls = [];
  document.querySelectorAll('#list input[type="checkbox"]').forEach(cb => {
    if (cb.checked) urls.push(scanImages[parseInt(cb.dataset.index, 10)]);
  });

  if (urls.length === 0) return alert("Selection vide.");

  const format = document.getElementById('selFormat').value;
  const quality = document.getElementById('rangeQuality').value;
  
  const btn = document.getElementById('btnDownload');
  btn.textContent = "Traitement en cours...";
  btn.disabled = true;

  let folderName = "scan_web";
  try { folderName = new URL(pageUrl).hostname.split('.')[0]; } catch(e) {}

  chrome.runtime.sendMessage({
    action: "downloadImages",
    urls: urls,
    baseName: folderName,
    quality: parseInt(quality),
    format: format
  }, () => {
    setTimeout(() => window.close(), 1000);
  });
});
