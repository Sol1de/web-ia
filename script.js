// DOM Elements
const canvas = document.getElementById('drawingCanvas')
const ctx = canvas.getContext('2d')
const clearBtn = document.getElementById('clearBtn')
const predictBtn = document.getElementById('predictBtn')
const predictionEl = document.getElementById('prediction')
const confidenceEl = document.getElementById('confidence')
const probabilitiesEl = document.getElementById('probabilities')

// Vars
let session = null
let isDrawing = false
let lastX = 0
let lastY = 0

// Init & setup
async function init() {
    session = await setupModelSession()
    setupCanvas()
    setupEventListeners()
    renderProbabilities(new Array(10).fill(0))
}

function setupCanvas() {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
}

async function setupModelSession() {
    return ort.InferenceSession.create('./model.onnx');
}

function setupEventListeners() {
    canvas.addEventListener('mousedown', startDrawing)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', stopDrawing)
    canvas.addEventListener('mouseout', stopDrawing)
    canvas.addEventListener('touchend', stopDrawing)
    clearBtn.addEventListener('click', clearCanvas)
    predictBtn.addEventListener('click', predict)
}

// Drawing
function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = getPosition(e)
}

function draw(e) {
    if (!isDrawing) return
    e.preventDefault()

    const [x, y] = getPosition(e)

    ctx.beginPath()
    ctx.moveTo(lastX, lastY)
    ctx.lineTo(x, y)
    ctx.stroke();

    [lastX, lastY] = [x, y]
}

function stopDrawing() {
    isDrawing = false
}

function getPosition(e) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if (e.touches) {
        return [
            (e.touches[0].clientX - rect.left) * scaleX,
            (e.touches[0].clientY - rect.top) * scaleY
        ]
    }
    return [
        (e.clientX - rect.left) * scaleX,
        (e.clientY - rect.top) * scaleY
    ]
}

function getImageData() {
    return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

function resizeImage() {
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = 28
    tempCanvas.height = 28
    const tempCtx = tempCanvas.getContext('2d')
    tempCtx.drawImage(canvas, 0, 0, 28, 28)
    return tempCtx.getImageData(0, 0, 28, 28)
}

function softMax(arr) {
    const max = Math.max(...arr)
    const exps = arr.map(l => Math.exp(l - max))
    const sum = exps.reduce((a, b) => a + b)
    return exps.map(e => e / sum)
}

// Clear canvas
function clearCanvas() {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    predictionEl.textContent = '-'
    confidenceEl.textContent = ''
    renderProbabilities(new Array(10).fill(0))
}

// Number prediction
async function predict() {
    const imageData = resizeImage()
    const tensor = new ort.Tensor(
        'float32',
        Float32Array.from({ length: 784 }, (_, i) => imageData.data[i * 4] / 255),
        [1, 1, 28, 28]
    )
    const results = await session.run({ x: tensor })
    const logits = [...results.linear_2.data].map(n => Number(n))
    const probs = softMax(logits)
    const predicted = probs.indexOf(Math.max(...probs))
    const confidence = Math.max(...probs)

    predictionEl.textContent = predicted.toString()
    confidenceEl.textContent = `${(confidence * 100).toFixed(1)}%`
    renderProbabilities(probs)
}

// Probabilities
function renderProbabilities(probs) {
    const maxIndex = probs.indexOf(Math.max(...probs))

    probabilitiesEl.innerHTML = probs.map((prob, i) => `
        <div class="prob-item ${i === maxIndex && prob > 0 ? 'highlight' : ''}">
            <div class="digit">${i}</div>
            <div class="prob">${(prob * 100).toFixed(1)}%</div>
        </div>
    `).join('')
}

// Launch init
init().then(() => console.log("Initialisation successfully ended."))