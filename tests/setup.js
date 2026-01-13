// Vitest setup file
// Mock DOM environment for cytoscape

global.cyeditorTestEnv = true

// Mock Canvas API for Cytoscape in JSDOM
if (typeof global.HTMLCanvasElement !== 'undefined') {
    global.HTMLCanvasElement.prototype.getContext = () => {
        return {
            fillRect: () => { },
            clearRect: () => { },
            getImageData: (x, y, w, h) => {
                return {
                    data: new Array(w * h * 4)
                }
            },
            putImageData: () => { },
            createImageData: () => { return [] },
            setTransform: () => { },
            drawImage: () => { },
            save: () => { },
            restore: () => { },
            beginPath: () => { },
            moveTo: () => { },
            lineTo: () => { },
            closePath: () => { },
            stroke: () => { },
            translate: () => { },
            scale: () => { },
            rotate: () => { },
            arc: () => { },
            fill: () => { },
            measureText: () => { return { width: 0 } },
            transform: () => { },
            rect: () => { },
            clip: () => { },
        }
    }
}
