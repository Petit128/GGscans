chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "downloadImages") {
    const { urls, baseName, quality, format } = request;
    processImages(urls, baseName, quality, format).then(() => sendResponse({ status: "ok" }))
      .catch(err => { console.error(err); sendResponse({ status: "error" }); });
    return true;
  }
});

async function processImages(urls, baseName, quality, format) {
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const num = String(i + 1).padStart(3, "0");
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const imageBitmap = await createImageBitmap(blob);
      
      const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageBitmap, 0, 0);
      
      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/webp';
      const newBlob = await canvas.convertToBlob({ type: mimeType, quality: quality / 100 });
      
      const reader = new FileReader();
      reader.readAsDataURL(newBlob);
      const dataUrl = await new Promise((resolve) => { reader.onloadend = () => resolve(reader.result); });
      
      const ext = format === 'jpeg' ? 'jpg' : 'webp';
      await chrome.downloads.download({
        url: dataUrl,
        filename: `scans/${baseName}/page_${num}.${ext}`,
        conflictAction: "uniquify"
      });
    } catch (err) {
      chrome.downloads.download({ url: url, filename: `scans/${baseName}/orig_${num}.jpg`, conflictAction: "uniquify" });
    }
  }
}
