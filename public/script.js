let characterWidth = 6;
let characterHeight = 4;
let order = [
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    'abcdefghijklmnopqrstuvwxyz',
    '`1234567890-=[],./\\;\'',
    '~!@#$%^&*()_+{}<>?|:"'
];

const previewCanvas = document.querySelector('#preview');
const hoveredInfo = document.querySelector('#hovered_info');
const hoveredHighlight = document.querySelector('#hovered_highlight');

let chars = {};
let font = false;

let imageData = false;

document.querySelector('#upload').addEventListener('change', e => {
    if (!e.target.files) return;
    loadImage(URL.createObjectURL(e.target.files[0]));
    e.target.value = '';
});

document.querySelector('#order').addEventListener('change', e => {
    if (!e.target.files) return;

    const reader = new FileReader();
    reader.onload = () => {
        order = reader.result.split(/\n|\r/g);
        processFont();
    };
    reader.readAsText(e.target.files[0]);
});

document.querySelector('#width').addEventListener('change', e => {
    width = e.target.value;
    if (width != characterWidth) {
        characterWidth = width;
        processFont();
    }
});

document.querySelector('#height').addEventListener('change', e => {
    height = e.target.value;
    if (height != characterHeight) {
        characterHeight = height;
        processFont();
    }
});

document.addEventListener('mousemove', e => {
    const point = getHoverPoint(e.clientX, e.clientY);
    const char = point ? getCharAt(point[0], point[1]) : null;

    hoveredInfo.style.display = char ? 'block' : 'none';
    hoveredInfo.innerHTML = char;

    hoveredHighlight.style.display = hoveredInfo.style.display;

    if (!char) return;
    const rect = previewCanvas.getBoundingClientRect();
    const scale = rect.width / previewCanvas.width;

    const [cx, cy] = transformPoint(
        Math.floor(point[0] / (characterWidth * 2)) * (characterWidth * 2),
        Math.floor(point[1] / (characterHeight * 4)) * (characterHeight * 4)
    );

    const left = (cx * scale + rect.left);
    const top = (cy * scale + rect.top) + window.scrollY;

    hoveredInfo.style.left = (left - 30) + 'px';
    hoveredInfo.style.top = (top - 30) + 'px';

    hoveredHighlight.style.left = left + 'px';
    hoveredHighlight.style.top = top + 'px';
    hoveredHighlight.style.width = ((characterWidth * 5 - 1) * scale) + 'px';
    hoveredHighlight.style.height = ((characterHeight * 10 - 2) * scale) + 'px';
});

function getHoverPoint(clientX, clientY) {
    if (!font) return null;

    const rect = previewCanvas.getBoundingClientRect();

    const mx = (clientX - rect.left) / rect.width;
    const my = (clientY - rect.top) / rect.height;

    if (mx < 0 || mx > 1 || my < 0 || my > 1)
        return null;

    const tx = Math.floor(mx * previewCanvas.width);
    const ty = Math.floor(my * previewCanvas.height);

    return transformPointInverse(tx, ty);
}

async function loadImage(imageUrl) {
    imageData = await getImageData(imageUrl);
    URL.revokeObjectURL(imageUrl);
    processFont();
}

function processFont() {
    if (!imageData) return;
    chars = {
        ' ': createEmptyChar()
    };
    const data = imageData.data;

    let [previewWidth, previewHeight] = transformPoint(imageData.width - 1, imageData.height - 1);
    previewWidth += 2;
    previewHeight += 2;
    previewCanvas.width = previewWidth;
    previewCanvas.height = previewHeight;
    const ctx = previewCanvas.getContext('2d');

    const previewImageData = new ImageData(previewWidth, previewHeight);
    const previewData = previewImageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const index = Math.floor(i / 4);
        const x = (index % imageData.width);
        const y = Math.floor(index / imageData.width);

        const [previewX, previewY] = transformPoint(x, y);
        const points = [
            [previewX, previewY],
            [previewX + 1, previewY],
            [previewX + 1, previewY + 1],
            [previewX, previewY + 1]
        ];

        for (const [pointX, pointY] of points) {
            const previewIndex = getIndex(pointX, pointY, previewWidth);
            previewData[previewIndex] = data[i];
            previewData[previewIndex + 1] = data[i + 1];
            previewData[previewIndex + 2] = data[i + 2];
            previewData[previewIndex + 3] = data[i + 3];
        }

        if (data[i + 3] > 0) fillCharPixel(x, y);
    }

    ctx.putImageData(previewImageData, 0, 0);

    const processedChars = {};
    Object.entries(chars).forEach(([char, charPixels]) => {
        processedChars[char] = charPixels.map(line => processLine(line));
    });

    font = {
        name: 'My Cool Font',
        height: characterHeight,
        characterSeparator: '',
        characters: processedChars
    };
}

function getCharAt(x, y) {
    const cx = Math.floor(x / (characterWidth * 2));
    const cy = Math.floor(y / (characterHeight * 4));
    const line = order[cy];
    return line != null ? line[cx] : null;
}

function getCharPoint(x, y) {
    return [x % (characterWidth * 2), y % (characterHeight * 4)];
}

function getMaskY(oy) {
    switch (oy) {
        case 0: return 0b11_00_00_00;
        case 1: return 0b00_11_00_00;
        case 2: return 0b00_00_11_00;
        default: return 0b00_00_00_11;
    }
}

function getMaskX(ox) {
    return ox == 0 ?
        0b10_10_10_10 :
        0b01_01_01_01;
}

function getCharMask(cx, cy) {
    return getMaskX(cx) & getMaskY(cy);
}

function createEmptyChar() {
    const charPixels = [];
    for (let i = 0; i < characterHeight; i++) {
        const line = [];
        for (let j = 0; j < characterWidth; j++) line[j] = 0b00_00_00_00;
        charPixels[i] = line;
    }
    return charPixels;
}

function fillCharPixel(x, y) {
    const char = getCharAt(x, y);
    if (!char) return;

    let charPixels = chars[char] ?? createEmptyChar();
    const [cx, cy] = getCharPoint(x, y);
    const mask = getCharMask(cx % 2, cy % 4);
    const line = charPixels[Math.floor(cy / 4)];
    if (line == null) return;
    line[Math.floor(cx / 2)] |= mask;

    chars[char] = charPixels;
}

function transformPoint(x, y) {
    let tx = x * 2;
    let ty = y * 2;

    tx += Math.floor(x / 2);
    ty += Math.floor(y / 4) * 2;

    tx += Math.floor(x / (characterWidth * 2)) * 6;
    ty += Math.floor(y / (characterHeight * 4)) * 12;

    return [tx, ty];
}

function transformPointInverse(tx, ty) {
    const chw = characterWidth * 5 - 1;
    const chh = characterHeight * 10 - 2;

    const chx = (tx % (chw + 7)) / chw;
    if (chx >= 1 || chx < 0) return null;
    const chy = (ty % (chh + 14)) / chh;
    if (chy >= 1 || chy < 0) return null;

    const px = Math.floor(tx / (chw + 7)) + chx;
    const py = Math.floor(ty / (chh + 14)) + chy;

    const x = Math.floor(px * characterWidth * 2);
    const y = Math.floor(py * characterHeight * 4);

    return [x, y];
}

function getIndex(x, y, width) {
    return (x + y * width) * 4;
}

async function getImageData(imageUrl) {
    return loadImageUrl(imageUrl).then(image => createImageBitmap(image).then(result => {
        const canvas = new OffscreenCanvas(result.width, result.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(result, 0, 0);
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }));
}

async function loadImageUrl(imageUrl) {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.onerror = reject;
        image.onload = () => resolve(image)

        image.crossOrigin = 'anonymous';
        image.src = imageUrl;
    });
}

const downloadFont = async () => {
    if (!font) return;

    const filename = 'mycoolfont.json'

    const name = window.prompt('Download as...', filename.substring(0, filename.lastIndexOf('.')));
    if (name === null) return;

    font.name = name;
    const content = JSON.stringify(font, null, 2);

    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    link.href = url;
    link.download = name + filename.substring(filename.lastIndexOf('.'));

    link.click();
    URL.revokeObjectURL(url);
};