document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const ctx =
        canvas.getContext('2d', { willReadFrequently: true }) ||
        canvas.getContext('2d');

    if (!ctx) {
        alert('Canvas is not supported in this browser.');
        return;
    }

    // Tool buttons
    const penBtn = document.getElementById('pen-tool');
    const highlighterBtn = document.getElementById('highlighter-tool');
    const eraserBtn = document.getElementById('eraser-tool');
    const clearBtn = document.getElementById('clear-tool');

    const tools = {
        PEN: 'pen',
        HIGHLIGHTER: 'highlighter',
        ERASER: 'eraser'
    };

    // State
    let currentTool = tools.PEN;
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    // Tool Configuration
    const config = {
        [tools.PEN]: {
            strokeStyle: '#1e293b', // Slate-800
            lineWidth: 2,
            globalCompositeOperation: 'source-over',
            lineCap: 'round',
            lineJoin: 'round'
        },
        [tools.HIGHLIGHTER]: {
            strokeStyle: 'rgba(254, 240, 138, 0.5)', // Yellow-200 with transparency
            lineWidth: 20,
            globalCompositeOperation: 'source-over', // Multiply might be better for realistic highlighter but source-over is consistent
            lineCap: 'square',
            lineJoin: 'round'
        },
        [tools.ERASER]: {
            strokeStyle: '#ffffff', // Not used for destination-out but placeholder
            lineWidth: 30,
            globalCompositeOperation: 'destination-out',
            lineCap: 'round',
            lineJoin: 'round'
        }
    };

    // Initialize Canvas Size
    function resizeCanvas() {
        const parent = canvas.parentElement;
        // Adjust for margins if any
        // Getting exact pixels for sharp rendering on High DPI screens
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        ctx.scale(dpr, dpr);

        // Reset context properties after resize as they get cleared
        updateContext();
    }

    // Call resize initially and on window resize
    // Note: Resizing clears the canvas. For a production app, we'd save/restore the image.
    // For this simple demo, we'll accept clear-on-resize or try to preserve it.
    // Let's implement a simple preservation mechanism.
    let canvasContent = null;

    function saveCanvasContent() {
        canvasContent = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    function restoreCanvasContent() {
        if (canvasContent) {
            ctx.putImageData(canvasContent, 0, 0);
        }
    }

    // Initial size
    resizeCanvas();
    // Re-apply tool settings
    updateContext();

    window.addEventListener('resize', () => {
        // Simple debounce could be added here
        // For now, simpler: user loses drawing on resize is common in simple demos, 
        // but let's try to just resize the buffer effectively? 
        // Actually, changing width/height clears canvas. 
        // Let's just re-setup context without saving content for simplicity in this MVP 
        // unless requested. Better to keep it clean.
        // If we want to strictly follow "simple", we can skip complex resize logic.
        // But "Premium" feel requires handling resize without losing work usually...
        // Let's skip preservation for the Step 1 MVP to ensure stability, 
        // as scaling bitmaps is tricky without a backing store.
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCtx.drawImage(canvas, 0, 0);

        resizeCanvas();
        ctx.drawImage(tempCanvas, 0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
        updateContext();
    });

    function updateContext() {
        const settings = config[currentTool];
        ctx.strokeStyle = settings.strokeStyle;
        ctx.lineWidth = settings.lineWidth;
        ctx.lineCap = settings.lineCap;
        ctx.lineJoin = settings.lineJoin;
        ctx.globalCompositeOperation = settings.globalCompositeOperation;
    }

    function setActiveTool(tool) {
        currentTool = tool;

        // UI Updates
        [penBtn, highlighterBtn, eraserBtn].forEach(btn => btn.classList.remove('active'));

        if (tool === tools.PEN) penBtn.classList.add('active');
        if (tool === tools.HIGHLIGHTER) highlighterBtn.classList.add('active');
        if (tool === tools.ERASER) eraserBtn.classList.add('active');

        updateContext();
    }

    // Drawing Logic
    function startDrawing(e) {
        isDrawing = true;

        // Get correct coordinates
        const { x, y } = getCoordinates(e);
        lastX = x;
        lastY = y;

        // Draw a dot for immediate feedback (optional, mostly for brush feel)
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(lastX, lastY);
        ctx.stroke();
    }

    function draw(e) {
        if (!isDrawing) return;

        const { x, y } = getCoordinates(e);

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();

        lastX = x;
        lastY = y;
    }

    function stopDrawing() {
        isDrawing = false;
        ctx.beginPath(); // Reset path to prevent connecting new lines to old ones
    }

    function getCoordinates(e) {
        // Handle touch and mouse
        // e.clientX is relative to viewport
        // rect is relative to viewport
        const rect = canvas.getBoundingClientRect();

        let clientX = e.clientX;
        let clientY = e.clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    // Pointer Events (mouse/touch/pen unified)
    canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        startDrawing(e);
    });
    canvas.addEventListener('pointermove', (e) => {
        e.preventDefault();
        draw(e);
    });
    canvas.addEventListener('pointerup', stopDrawing);
    canvas.addEventListener('pointercancel', stopDrawing);
    canvas.addEventListener('pointerleave', stopDrawing);

    // Tool Selection
    penBtn.addEventListener('click', () => setActiveTool(tools.PEN));
    highlighterBtn.addEventListener('click', () => setActiveTool(tools.HIGHLIGHTER));
    eraserBtn.addEventListener('click', () => setActiveTool(tools.ERASER));

    // Save Image
    const saveBtn = document.getElementById('save-tool');
    saveBtn.addEventListener('click', () => {
        // Create a temporary canvas to composite white background
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;

        // Fill white background
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw original canvas on top
        tempCtx.drawImage(canvas, 0, 0);

        // Create download link
        const link = document.createElement('a');
        link.download = `scribble-${Date.now()}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    });

    // Clear Canvas
    clearBtn.addEventListener('click', () => {
        // Save current composite operation to restore later
        const currentComposite = ctx.globalCompositeOperation;

        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio); // use logical pixels

        // Restore
        ctx.globalCompositeOperation = currentComposite;
    });
});
