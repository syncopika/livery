let clickXMask = [];
let clickYMask = [];
let clickDragMask = [];
let clickColorMask = [];
let clickSizeMask = [];
let isDrawingMask = false;

function brushStartMask(evt){
    evt.preventDefault();
    if(evt.which === 1){
        isDrawingMask = true;
        addClickMask(evt, true);
        strokeMask();
    }
}

function brushMoveMask(evt){
    evt.preventDefault();
    if(isDrawingMask){
        addClickMask(evt, true);
        strokeMask();
    }
}

function brushStopMask(){
    clearClickMask();
    isDrawingMask = false;
}

function addClickMask(ptrEvt, dragging){
    const size = currBrushSize; // this is initialized in index.js //5;
    const color = 'rgba(255, 255, 255, 255)'; // TODO: what if we want to remask? how to do
    const x = ptrEvt.offsetX;
    const y = ptrEvt.offsetY;
    clickXMask.push(x);
    clickYMask.push(y);
    clickColorMask.push(color);
    clickSizeMask.push(size);
    clickDragMask.push(true);
}

function strokeMask(){
    const ctx = document.getElementById('maskingLayer').getContext('2d');
    
    for(let i = 0; i < clickXMask.length; i++){
        ctx.lineJoin = 'round';
        ctx.lineWidth = clickSizeMask[i];
        ctx.strokeStyle = clickColorMask[i];
        ctx.beginPath();
        
        if(clickDragMask[i] && i){
            ctx.moveTo(clickXMask[i-1], clickYMask[i-1]);
        }else{
            // single dot
            ctx.moveTo(clickXMask[i], clickYMask[i]+1);
        }
        
        ctx.lineTo(clickXMask[i], clickYMask[i]);
        ctx.closePath();
        ctx.stroke();
    }
}

function clearClickMask(){
    clickXMask = [];
    clickYMask = [];
    clickDragMask = [];
    clickColorMask = [];
    clickSizeMask = [];
}


function setupMaskingLayer(){
    const maskingLayer = document.getElementById('maskingLayer');
    
    maskingLayer.style.position = "absolute";
    maskingLayer.style.top = 0;
    maskingLayer.style.left = 0;
    maskingLayer.style.display = "none";
    
    const ctx = maskingLayer.getContext('2d');
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; // semi-transparent black
    ctx.fillRect(0, 0, maskingLayer.width, maskingLayer.height);
    
    maskingLayer.addEventListener('pointerdown', brushStartMask);
    maskingLayer.addEventListener('pointerup', brushStopMask);
    maskingLayer.addEventListener('pointermove', brushMoveMask);
    maskingLayer.addEventListener('pointerleave', brushStopMask);
}

let maskingLayerOn = false;
document.getElementById('toggleMaskingLayer').addEventListener('click', () => {
    const maskingLayer = document.getElementById('maskingLayer');
    const liveryCanvas = document.getElementById('liveryCanvas');
    
    if(maskingLayer.style.display === "none"){
        maskingLayer.style.display = "block";
        maskingLayer.style.zIndex = 5;
        liveryCanvas.style.opacity = 0.8;
    }else{
        maskingLayer.style.display = "none";
        liveryCanvas.style.opacity = 1;
        maskingLayer.style.zIndex = -1;
    }
    
    maskingLayerOn = !maskingLayerOn;
});

function applyMaskingLayer(){
    const mainCanvas = document.getElementById('liveryCanvas');
    const maskingCanvas = document.getElementById('maskingLayer');
    
    const mainCtx = mainCanvas.getContext('2d');
    const maskCtx = maskingCanvas.getContext('2d');
    
    const width = mainCanvas.width;
    const height = mainCanvas.height;
    
    const mainImgData = mainCtx.getImageData(0, 0, width, height);
    const maskImgData = maskCtx.getImageData(0, 0, width, height);
    
    for(let i = 0; i < height; i++){
        for(let j = 0; j < width; j++){
            // we just care about checking the alpha value
            // TODO: how about any "unused" area that has no pasted image pixels? should we ignore that too?
            const maskAlpha = maskImgData.data[i*width*4 + j*4 + 3];
            if(maskAlpha === 153){
                // alpha is 0.6
                continue;
            }
            
            const maskR = maskImgData.data[i*width*4 + j*4];
            const maskG = maskImgData.data[i*width*4 + j*4 + 1];
            const maskB = maskImgData.data[i*width*4 + j*4 + 2];
            
            mainImgData.data[i*width*4 + j*4] = maskR;
            mainImgData.data[i*width*4 + j*4 + 1] = maskG;
            mainImgData.data[i*width*4 + j*4 + 2] = maskB;
        }
    }
    
     mainCtx.putImageData(mainImgData, 0, 0);
     
     // hide masking layer
     document.getElementById('toggleMaskingLayer').click();
     
}
document.getElementById('applyMaskingLayer').addEventListener('click', applyMaskingLayer);

function clearMaskingLayer(){
    const maskingLayer = document.getElementById('maskingLayer');
    const maskCtx = maskingLayer.getContext('2d');
    maskCtx.clearRect(0, 0, maskingLayer.width, maskingLayer.height);
    maskCtx.fillStyle = "rgba(0, 0, 0, 0.6)"; // semi-transparent black
    maskCtx.fillRect(0, 0, maskingLayer.width, maskingLayer.height);
}
document.getElementById('clearMaskingLayer').addEventListener('click', clearMaskingLayer);


