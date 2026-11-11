// Injection du script dans la page pour contourner les restrictions
async function detectAndPrepareImages() {
    // 1. On force le defilement pour charger le lazy-loading
    await autoScroll();

    // 2. On laisse 1.5 seconde aux images pour finir de charger
    await new Promise(r => setTimeout(r, 1500));

    const foundUrls = new Set();

    // A. Chercher les balises <img> classiques et lazy
    document.querySelectorAll('img').forEach(img => {
        const candidates = [
            img.src,
            img.getAttribute('data-src'),
            img.getAttribute('data-lazy-src'),
            img.getAttribute('data-original'),
            img.getAttribute('data-url')
        ];
        
        candidates.forEach(src => {
            if (src && src.startsWith('http') && !isJunk(src)) {
                // On verifie la taille si l'image est chargee
                if (img.naturalWidth > 400 || img.naturalWidth === 0) {
                    foundUrls.add(src);
                }
            }
        });
    });

    // B. Chercher dans les CSS (background-image)
    document.querySelectorAll('*').forEach(el => {
        const bg = window.getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none' && bg.includes('url(')) {
            const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
            if (match && match[1] && match[1].startsWith('http') && !isJunk(match[1])) {
                foundUrls.add(match[1]);
            }
        }
    });

    return Array.from(foundUrls);
}

function isJunk(url) {
    const u = url.toLowerCase();
    return u.includes('logo') || u.includes('banner') || u.includes('flag') || 
           u.includes('avatar') || u.includes('icon') || u.includes('pub') ||
           u.includes('loading') || u.includes('discord');
}

async function autoScroll() {
    return new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 500;
        const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeight) {
                clearInterval(timer);
                window.scrollTo(0, 0); // Remonte en haut
                resolve();
            }
        }, 100);
    });
}

// Ecouteur pour le popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getScanData") {
        detectAndPrepareImages().then(urls => {
            sendResponse({ urls: urls, pageUrl: window.location.href });
        });
        return true; // Indique qu'on repond de facon asynchrone
    }
});
