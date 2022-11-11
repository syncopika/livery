// this stuff is taken from: 
// https://github.com/syncopika/funSketch/blob/master/experiments/pasteToolExperiment/pasteTest.html

let isMovingPasteCanvas = false;
let lastOffsetHeight = 0;
let lastOffsetWidth = 0;
let initialOffsetX = 0;
let initialOffsetY = 0;

let resizingPasteCanvas = false;
let lastX = null;
let lastY = null;

let currPasteCanvasRotation = 0;
let rotatingPasteCanvas = false;

let originalPasteImage;

function addPasteCanvas(imgData, width, height){
    const displayArea = document.getElementById('liveryDisplay');
    const canvasElement = document.createElement("canvas");
    displayArea.appendChild(canvasElement);
    canvasElement.className = "pasteCanvas";
    canvasElement.style.position = "absolute";
    canvasElement.style.border = "1px #000 dotted";
    canvasElement.style.zIndex = 10;
    canvasElement.style.top = 0;
    canvasElement.style.left = 0;
    
    // https://stackoverflow.com/questions/50315340/javascript-rotate-canvas-image-corners-are-clipped-off
    const diagLen = Math.sqrt((imgData.width*imgData.width) + (imgData.height*imgData.height));
    canvasElement.width = diagLen;
    canvasElement.height = diagLen;
    
    const ctx = canvasElement.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
    
    // draw image in center of canvas
    ctx.setTransform(1, 0, 0, 1, canvasElement.width/2, canvasElement.height/2);
    ctx.drawImage(imgData, -imgData.width/2, -imgData.height/2);
    
    return canvasElement;
}

function allowScaleAndRotate(evt){
    const pasteCanvas = document.querySelector('.pasteCanvas');
    if(pasteCanvas){
        if(evt.keyCode === 83){
            // s key
            resizingPasteCanvas = !resizingPasteCanvas;
        }else if(evt.keyCode === 82){
            // r key
            rotatingPasteCanvas = !rotatingPasteCanvas;
        }else if(evt.keyCode === 27){
            // esc key
            // cancel
            pasteCanvas.parentNode.removeChild(pasteCanvas);
            resizingPasteCanvas = false;
            rotatingPasteCanvas = false;
            currPasteCanvasRotation = 0;
        }
    }
}
document.addEventListener('keydown', allowScaleAndRotate);

function redrawImage(newRotation, sHeight, sWidth, dx, dy, dHeight, dWidth, pasteCanvas, ctx){
    // translate the (0,0) coord (where the top-left of the image will be in the canvas)
    if(newRotation === 0){
        ctx.translate(0, 0);
    }else if(newRotation === 90 || newRotation === -270){
        ctx.translate(pasteCanvas.width, 0);
    }else if(newRotation === 180 || newRotation === -180){
        ctx.translate(pasteCanvas.width, pasteCanvas.height);
    }else if(newRotation === 270 || newRotation === -90){
        ctx.translate(0, pasteCanvas.height);
    }
    
    ctx.setTransform(1, 0, 0, 1, pasteCanvas.width/2, pasteCanvas.height/2);
    ctx.rotate(newRotation * Math.PI / 180);
    ctx.drawImage(originalPasteImage, 0, 0, sWidth, sHeight, dx, dy, dWidth, dHeight);
}

function addPasteCanvasEventListeners(pasteCanvas, initialCanvasWidth, initialCanvasHeight){
    // apply some styling to indicate we're pasting an image
    pasteCanvas.parentNode.style.border = '#000 2px solid'; //document.getElementById('liveryCanvas').parentNode.style.border = '#000 2px solid';
    
    pasteCanvas.addEventListener('wheel', (evt) => {
        if(!rotatingPasteCanvas) return;
        
        evt.preventDefault();
        
        let newRotation = currPasteCanvasRotation;
        
        if(evt.deltaY > 0){
            // rotate left
            newRotation -= 1;
        }else{
            newRotation += 1;
        }
        
        newRotation %= 360;
        
        // https://stackoverflow.com/questions/17040360/javascript-function-to-rotate-a-base-64-image-by-x-degrees-and-return-new-base64
        const ctx = pasteCanvas.getContext("2d");
        
        // https://stackoverflow.com/questions/17411991/html5-canvas-rotate-image
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.clearRect(0, 0, pasteCanvas.width, pasteCanvas.height);
        
        const dHeight = (pasteCanvas.height/initialCanvasHeight)*originalPasteImage.height;
        const dWidth = (pasteCanvas.width/initialCanvasWidth)*originalPasteImage.width;
        const dx = -dWidth/2;
        const dy = -dHeight/2;
        
        ctx.setTransform(1, 0, 0, 1, pasteCanvas.width/2, pasteCanvas.height/2);
        ctx.rotate(newRotation * Math.PI / 180);
        
        ctx.drawImage(originalPasteImage, 0, 0, originalPasteImage.width, originalPasteImage.height, dx, dy, dWidth, dHeight);
        //ctx.drawImage(originalPasteImage, -currImgWidth/2, -currImgHeight/2);
        
        currPasteCanvasRotation = newRotation;
    });

    pasteCanvas.addEventListener('pointerdown', (evt) => {
        isMovingPasteCanvas = true;
        initialOffsetX = evt.offsetX;
        initialOffsetY = evt.offsetY;
    });
    
    pasteCanvas.addEventListener('pointermove', (evt) => {
        if(isMovingPasteCanvas){
            const currX = evt.offsetX;
            const currY = evt.offsetY;
            
            const offsetY = Math.abs(currY - initialOffsetY);
            const offsetX = Math.abs(currX - initialOffsetX);
            
            if(currY < lastOffsetHeight){
                pasteCanvas.style.top = (parseInt(pasteCanvas.style.top) - offsetY) + "px";
            }else{
                pasteCanvas.style.top = (parseInt(pasteCanvas.style.top) + offsetY) + "px";
            }
            lastOffsetHeight = currY;
            
            if(currX < lastOffsetWidth){
                pasteCanvas.style.left = (parseInt(pasteCanvas.style.left) - offsetX) + "px";
            }else{
                pasteCanvas.style.left = (parseInt(pasteCanvas.style.left) + offsetX) + "px";
            }
            lastOffsetWidth = currX;
        }else if(resizingPasteCanvas){
            // https://stackoverflow.com/questions/24429830/html5-canvas-how-to-change-putimagedata-scale
            // https://stackoverflow.com/questions/23104582/scaling-an-image-to-fit-on-canvas
            const ctx = pasteCanvas.getContext('2d');
            
            const x = evt.pageX;
            const y = evt.pageY;
            
            let deltaX, deltaY;
            if(lastX === null || x === lastX){
                deltaX = 0;
            }else if(x < lastX){
                deltaX = -1;
            }else{
                deltaX = 1;
            }
            
            if(lastY === null || y === lastY){
                deltaY = 0;
            }else if(y < lastY){
                deltaY = -1;
            }else{
                deltaY = 1;
            }
            
            lastX = x;
            lastY = y;
            
            // adjust the canvas dimensions,
            // then draw back the original image
            pasteCanvas.width += deltaX*2;
            pasteCanvas.height += deltaY*2;
            
            //redrawImage(currPasteCanvasRotation, pasteCanvas, ctx);
            const sHeight = originalPasteImage.height;
            const sWidth = originalPasteImage.width;
            const dHeight = (pasteCanvas.height/initialCanvasHeight)*originalPasteImage.height;
            const dWidth = (pasteCanvas.width/initialCanvasWidth)*originalPasteImage.width;
            const dx = -dWidth/2;
            const dy = -dHeight/2;

            redrawImage(currPasteCanvasRotation, sHeight, sWidth, dx, dy, dHeight, dWidth, pasteCanvas, ctx);
        }
    });
    
    pasteCanvas.addEventListener('pointerup', () => {
        isMovingPasteCanvas = false;
        if(resizingPasteCanvas) resizingPasteCanvas = false;
    });
    
    // add click event for outside the canvas to finalize image paste
    function finalizeImagePaste(evt){
        
        if(evt.target.classList.contains("pasteCanvas") || evt.target.id.toLowerCase().includes("livery") || evt.target.id.toLowerCase().includes("masking")){
            // user has to click outside the canvas to finalize the image paste
            return;
        }
        
        isMovingPasteCanvas = false;
        const mainCanvas = maskingLayerOn ? document.getElementById('maskingLayer') : document.getElementById('liveryCanvas'); //document.getElementById('liveryCanvas');        
        const mainCtx = mainCanvas.getContext('2d');
        
        document.body.removeEventListener("pointerup", finalizeImagePaste);
        mainCanvas.parentNode.style.border = 'none';
        
        if(pasteCanvas.parentNode === null){
            // if pasteCanvas no longer in the DOM
            return;
        }
        
        // place the image data from pasteCanvas onto the main canvas
        // figure out how much of the pasted image is visible and can be placed on the main canvas
        const pasteLeft = parseInt(pasteCanvas.style.left);
        const pasteTop = parseInt(pasteCanvas.style.top);
        
        let pasteImgRowStart = 0;
        let pasteImgRowEnd = pasteCanvas.height;
        
        let pasteImgColStart = 0;
        let pasteImgColEnd = pasteCanvas.width;
        
        let width;
        if(pasteLeft < 0){
            // image goes past the left side of the main canvas
            width = pasteCanvas.width + pasteLeft;
            pasteImgColStart = Math.abs(pasteLeft);
        }else if(pasteLeft + pasteCanvas.width <= mainCanvas.width){
            // if pasted image falls within the mainCanvas completely width-wise
            width = pasteCanvas.width;
        }else{
            // image goes past the right side of the main canvas
            width = mainCanvas.width - pasteLeft;
            pasteImgColEnd = width;
        }
        
        let height;
        if(pasteTop < 0){
            height = pasteCanvas.height + pasteTop;
            pasteImgRowStart = Math.abs(pasteTop);
        }else if(pasteTop + pasteCanvas.height <= mainCanvas.height){
            height = pasteCanvas.height;
        }else{
            height = mainCanvas.height - pasteTop;
            pasteImgRowEnd = height;
        }
        
        // isolate just the section of image data that should be pasted
        const pasteData = pasteCanvas.getContext('2d').getImageData(0,0,pasteCanvas.width,pasteCanvas.height).data;
        const pasteImgSectionData = [];
        for(let row = pasteImgRowStart*4*pasteCanvas.width; row < pasteImgRowEnd*4*pasteCanvas.width; row += (4*pasteCanvas.width)){
            for(let col = 4*pasteImgColStart; col < 4*pasteImgColEnd; col += 4){
                pasteImgSectionData.push(pasteData[row+col]);
                pasteImgSectionData.push(pasteData[row+col+1]);
                pasteImgSectionData.push(pasteData[row+col+2]);
                pasteImgSectionData.push(pasteData[row+col+3]);
            }
        }
        
        // the location on the main canvas where to start pasting the image
        const locX = (pasteLeft < 0) ? 0 : pasteLeft;
        const locY = (pasteTop < 0) ? 0 : pasteTop;
        
        const imgData = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
        const rowStartMain = mainCanvas.width*4*locY;
        const rowEndMain = mainCanvas.width*4*(locY+height);
        const colStart = locX*4;
        const colEnd = 4*(locX+width);
        let pasteImgDataIdx = 0;
        
        for(let i = rowStartMain; i < rowEndMain; i+=(mainCanvas.width*4)){
            for(let j = colStart; j < colEnd; j+=4){
                if(maskingLayerOn){
                    // if we're pasting an image on the masking layer, we only want to paste pixels of the image
                    // that correspond to pixels on the masking layer that are rgba(255, 255, 255, 255).
                    //console.log('rgba(' + imgData.data[i+j] + ',' + imgData.data[i+j+1] + ',' + imgData.data[i+j+2] + ',' + imgData.data[i+j+3] + ')'); 
                    const maskR = imgData.data[i+j] === 0;
                    const maskG = imgData.data[i+j+1] === 0;
                    const maskB = imgData.data[i+j+2] === 0;
                    const maskA = imgData.data[i+j+3] === 153;
                    if(maskR && maskG && maskB && maskA){
                        pasteImgDataIdx += 4; // don't forget to increment the paste image data though so we skip over the right pixels
                        continue;
                    }
                }
                
                const r = pasteImgSectionData[pasteImgDataIdx++];
                const g = pasteImgSectionData[pasteImgDataIdx++];
                const b = pasteImgSectionData[pasteImgDataIdx++];
                const a = pasteImgSectionData[pasteImgDataIdx++];
                
                // avoid adding transparency as black
                if(r === 0 &&
                   g === 0 &&
                   b === 0 &&
                   a === 0){
                   continue;
                }
                imgData.data[i+j] = r;
                imgData.data[i+j+1] = g;
                imgData.data[i+j+2] = b;
                imgData.data[i+j+3] = a;
            }
        }
        
        mainCtx.putImageData(imgData, 0, 0);
        
        pasteCanvas.parentNode.removeChild(pasteCanvas);
    }
    
    document.body.addEventListener("pointerup", finalizeImagePaste);
}

// need to add the event listener on the document
document.addEventListener("paste", (evt) => {
    const items = (evt.clipboardData || evt.originalEvent.clipboardData).items; // items is an object of type DataTransferItemList
    
    for(let i = 0; i < items.length; i++){
        if(items[i].type.indexOf("image") > -1){
            const file = items[i]; // items[i] is a DataTransferItem type object
            const blob = file.getAsFile();
            const url = URL.createObjectURL(blob);
            
            // place the image on a new canvas (so we can allow moving it around for placement)
            const img = new Image();
            img.onload = () => {
                const pasteCanvas = addPasteCanvas(img, img.width, img.height);
                addPasteCanvasEventListeners(pasteCanvas, pasteCanvas.width, pasteCanvas.height);
                originalPasteImage = img;
            };
            img.src = url;
            
            break;
        }
    }
});
