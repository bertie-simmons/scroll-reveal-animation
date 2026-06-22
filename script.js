// Register GSAP Plugin
gsap.registerPlugin(ScrollTrigger);

// Initialize Smooth Scroll (Lenis)
const lenis = new Lenis();
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// Configuration Parameters
const config = {
    cellSize: 18, // size of cell in px
    spreadAbove: 0.25,
    spreadBelow: 0.25,
    scatter: 0.1,
    densityCore: 0.4,
    threshold: 1,
    color: 'lightgrey',
    charSet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+='
};

// DOM Elements & Math Variables
const images = document.querySelectorAll('.spotlight-image');
const gridContainer = document.querySelector('.dissolve-grid');
const totalImages = images.length;
const totalTransitions = totalImages - 1;

gridContainer.style.setProperty('--dissolve-color', config.color);

// Reverse layer images so index 0 is on top
images.forEach((img, index) => {
    img.style.zIndex = totalImages - index;
});

// Setup Grid Dimensions
const cols = Math.ceil(window.innerWidth / config.cellSize);
const rows = Math.ceil(window.innerHeight / config.cellSize);
const fontSize = config.cellSize * 0.8;

const cellsData = [];
const cellElements = [];

function getRandomChar() {
    return config.charSet[Math.floor(Math.random() * config.charSet.length)];
}

// Pseudo-random hash function used in shaders for noise
function hash(r, c, seed) {
    const x = Math.sin(r * 12.9898 + c * 78.233 + seed) * 43758.5453123;
    return x - Math.floor(x);
}

// Generate the Grid Elements
for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'dissolve-cell';
        cell.style.width = `${config.cellSize}px`;
        cell.style.height = `${config.cellSize}px`;
        cell.style.left = `${c * config.cellSize}px`;
        cell.style.top = `${r * config.cellSize}px`;
        cell.style.fontSize = `${fontSize}px`;
        cell.innerText = getRandomChar();
        
        gridContainer.appendChild(cell);
        cellElements.push(cell);

        // Normalize vertical map position from 0 to 1
        const normY = r / (rows - 1);

        // Precalculate noise thresholds
        cellsData.push({
            normY: normY,
            threshold: hash(r, c, 123.45),
            scatterOffset: (hash(r, c, 678.90) - 0.5) * config.scatter
        });
    }
}

let activeTransitionIndex = -1;

// Animation Math Functions
function updateImageClips(index, localProgress) {
    images.forEach((img, i) => {
        if (i === index) {
            // Remap clip behavior based on scroll boundary offsets
            const clipPercent = Math.max(0, Math.min(100, (localProgress + config.spreadAbove) * 100));
            img.style.clipPath = `polygon(0% ${clipPercent}%, 100% ${clipPercent}%, 100% 100%, 0% 100%)`;
        }
    });
}

const totalTravelRange = 1 + config.spreadAbove + config.spreadBelow;

function updateDissolveGrid(bandCenter) {
    for (let i = 0; i < cellsData.length; i++) {
        const cell = cellsData[i];
        const el = cellElements[i];

        // Absolute distance adjusted with random noise scatter
        const rawDistance = cell.normY - bandCenter;
        const distFromCenter = Math.abs(rawDistance);
        
        const scatterAmt = Math.max(0, distFromCenter - config.densityCore);
        const noisyDistance = rawDistance + cell.scatterOffset * scatterAmt;

        // Check if the current cell falls inside the band boundaries
        if (noisyDistance > config.spreadBelow || noisyDistance < -config.spreadAbove) {
            el.style.visibility = 'hidden';
            continue;
        }

        // Quadratic falling density
        const normDist = noisyDistance > 0 ? noisyDistance / config.spreadBelow : -noisyDistance / config.spreadAbove;
        const density = 1.0 - normDist * normDist;

        if (density > cell.threshold * config.threshold) {
            el.style.visibility = 'visible';
            // Randomly swap characters mid-dissolve for static glitch style
            if (Math.random() > 0.85) el.innerText = getRandomChar();
        } else {
            el.style.visibility = 'hidden';
        }
    }
}

function hideAllCells() {
    cellElements.forEach(el => el.style.visibility = 'hidden');
}

// ScrollTrigger Implementation
ScrollTrigger.create({
    trigger: '.spotlight',
    start: 'top top',
    end: () => `+=${totalTransitions * window.innerHeight}`,
    pin: true,
    scrub: true,
    onUpdate: (self) => {
        const progress = self.progress;
        
        // Find which image segment we are transitions between
        const rawIndex = progress * totalTransitions;
        let index = Math.floor(rawIndex);
        if (index >= totalTransitions) index = totalTransitions - 1;

        // Progress within that isolated index (0 to 1)
        const localProgress = rawIndex - index;
        activeTransitionIndex = index;

        // Scale center coordinate from above buffer to below buffer
        const bandCenter = -config.spreadAbove + localProgress * totalTravelRange;

        if (localProgress <= 0 || localProgress >= 1) {
            hideAllCells();
            updateImageClips(index, localProgress);
        } else {
            updateImageClips(index, localProgress);
            updateDissolveGrid(bandCenter);
        }
    }
});