document.addEventListener('DOMContentLoaded', () => {
    const SETTINGS_KEY = 'web-album-settings';

    // Elements
    const imageElement = document.getElementById('current-image');
    const videoElement = document.getElementById('current-video');
    const initialMessage = document.getElementById('initial-message');
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const backgroundBlur = document.getElementById('background-blur');

    // State
    let mediaItems = [];
    let currentMediaIndex = 0;
    let previousMediaIndex = 0;
    let slideshowTimer = null;
    
    // Default Settings
    let settings = {
        interval: 5000,
        backgroundColor: '#000000',
        brightness: 100,
        transition: 'fade',
        order: 'sequential'
    };

    async function init() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }, err => {
                console.log('ServiceWorker registration failed: ', err);
                });
            });
        }
        loadSettings();
        applySettings();
        
        // Check for a starting index from the URL hash
        const hash = window.location.hash;
        if (hash && hash.startsWith('#image=')) {
            const indexFromHash = parseInt(hash.substring(7), 10);
            if (!isNaN(indexFromHash)) {
                currentMediaIndex = indexFromHash;
            }
        }
        
        try {
            const response = await fetch('assets/data/media-list.json?t=' + new Date().getTime());
            if (!response.ok) throw new Error(`Failed to load media-list.json: ${response.statusText}`);
            const data = await response.json();
            mediaItems = data.media || [];
        } catch (error) {
            console.error('Failed to fetch media:', error);
            showInitialMessage('media-list.json 파일을 불러오는데 실패했습니다.');
            return;
        }

        // Shuffle if random order is selected
        if (settings.order === 'random') {
            mediaItems.sort(() => Math.random() - 0.5);
        }

        if (mediaItems.length > 0 && currentMediaIndex < mediaItems.length) {
            hideInitialMessage();
            displayMedia(currentMediaIndex, null); // Initial display, no direction
        } else {
            showInitialMessage('표시할 미디어가 없거나, 잘못된 아이템 주소입니다.');
            nextBtn.style.display = 'none';
            prevBtn.style.display = 'none';
        }

        // Event Listeners
        nextBtn.addEventListener('click', () => showNextMedia(true));
        prevBtn.addEventListener('click', () => showPreviousMedia(true));

        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                } else {
                    document.documentElement.requestFullscreen().catch(err => {
                        console.error(`Error attempting to enable fullscreen: ${err.message} (${err.name})`);
                    });
                }
            });

            // Listen for fullscreen change events to update button text
            document.addEventListener('fullscreenchange', () => {
                if (document.fullscreenElement) {
                    fullscreenBtn.textContent = '창모드';
                } else {
                    fullscreenBtn.textContent = '앨범 모드';
                }
            });
        }

        // Toggle button logic
        const toggleBtn = document.getElementById('toggle-btn');
        const bottomLinksContainer = document.getElementById('bottom-links-container');

        if (toggleBtn && bottomLinksContainer) {
            toggleBtn.addEventListener('click', () => {
                toggleBtn.classList.toggle('open');
                bottomLinksContainer.classList.toggle('open');
            });
        }
    }

    function loadSettings() {
        const savedSettings = localStorage.getItem(SETTINGS_KEY);
        if (savedSettings) {
            settings = { ...settings, ...JSON.parse(savedSettings) };
        }
    }
    
    function applySettings() {
        document.documentElement.style.setProperty('--bg-color', settings.backgroundColor);
        const brightnessValue = `brightness(${settings.brightness}%)`;
        imageElement.style.filter = brightnessValue;
        videoElement.style.filter = brightnessValue;
    }

    function displayMedia(index, direction) {
        if (index < 0 || index >= mediaItems.length) return;

        clearTimeout(slideshowTimer);
        videoElement.onended = null;

        const currentMedia = mediaItems[index];
        const previousMedia = mediaItems[previousMediaIndex];
        
        const isCurrentImage = imageElement.src.includes(previousMedia?.path);
        const isCurrentVideo = videoElement.src.includes(previousMedia?.path);
        const outgoingElement = isCurrentImage ? imageElement : (isCurrentVideo ? videoElement : null);

        if (outgoingElement) {
            outgoingElement.className = '';
            if (settings.transition === 'slide' && direction) {
                const outClass = direction === 'next' ? 'slide-out-next' : 'slide-out-prev';
                outgoingElement.classList.add(outClass);
            }
        }
        
        const elementToShow = currentMedia.type === 'image' ? imageElement : videoElement;
        const elementToHide = currentMedia.type === 'image' ? videoElement : imageElement;

        // Handle background blur
        if (currentMedia.type === 'image') {
            backgroundBlur.style.backgroundImage = `url('${currentMedia.path}')`;
            backgroundBlur.style.opacity = 1;
        } else {
            backgroundBlur.style.opacity = 0;
        }

        elementToHide.style.display = 'none';
        elementToShow.style.display = 'block';
        elementToShow.src = currentMedia.path;
        elementToShow.className = '';

        const animateIn = () => {
            if (settings.transition === 'fade' || !direction) {
                elementToShow.classList.add('fade-in');
            } else {
                const inClass = direction === 'next' ? 'slide-in-next' : 'slide-in-prev';
                elementToShow.classList.add(inClass);
            }
            
            if (currentMedia.type === 'image') {
                startSlideshowTimer();
            } else {
                videoElement.play().catch(e => {
                    console.error("Video play failed", e);
                    showNextMedia(false);
                });
                videoElement.onended = () => showNextMedia(false);
            }
        };

        if (currentMedia.type === 'image') {
            imageElement.onload = animateIn;
        } else {
            animateIn();
        }
    }

    function startSlideshowTimer() {
        clearTimeout(slideshowTimer);
        slideshowTimer = setTimeout(() => showNextMedia(false), settings.interval);
    }

    function showNextMedia(isManual) {
        if (isManual) clearTimeout(slideshowTimer);
        previousMediaIndex = currentMediaIndex;
        currentMediaIndex = (currentMediaIndex + 1) % mediaItems.length;
        displayMedia(currentMediaIndex, 'next');
        if (isManual) startSlideshowTimer();
    }

    function showPreviousMedia(isManual) {
        if (isManual) clearTimeout(slideshowTimer);
        previousMediaIndex = currentMediaIndex;
        currentMediaIndex = (currentMediaIndex - 1 + mediaItems.length) % mediaItems.length;
        displayMedia(currentMediaIndex, 'prev');
        if (isManual) startSlideshowTimer();
    }

    function showInitialMessage(message) {
        initialMessage.querySelector('p').textContent = message;
        initialMessage.style.display = 'block';
    }

    function hideInitialMessage() {
        initialMessage.style.display = 'none';
    }

    init();
});
