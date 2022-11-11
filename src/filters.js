// some filter stuff for the canvas
function invertColor(pixels){
    const d = pixels.data;
    let r, g, b;
    for(let i = 0; i < d.length; i += 4){
        r = d[i];
        g = d[i + 1];
        b = d[i + 2];
        d[i] = 255 - r;
        d[i + 1] = 255 - g;
        d[i + 2] = 255 - b;
    }
    return pixels;
}

function mosaicFilter(pixels){
    const d = pixels.data;
    const copy = new Uint8ClampedArray(d);
    
    // get dimensions 
    const width = pixels.width;
    const height = pixels.height;
    
    // change sampling size here. lower for higher detail preservation, higher for less detail (because larger chunks)
    const chunkWidth = 10;
    const chunkHeight = 10;

    for(let i = 0; i < width; i += chunkWidth){
        for(let j = 0; j < height; j += chunkHeight){
            // multiply by width because all the image data is in a single array and a row is dependent on width
            const r = copy[4 * i + 4 * j * width];
            const g = copy[4 * i + 4 * j * width + 1];
            const b = copy[4 * i + 4 * j * width + 2];
            // now for all the other pixels in this chunk, set them to this color 
            for(let k = i; k < i + chunkWidth; k++){
                for(let l = j; l < j + chunkHeight; l++){
                    d[4 * k + 4 * l * width] = r;
                    d[4 * k + 4 * l * width + 1] = g;
                    d[4 * k + 4 * l * width + 2] = b;
                }
            }
        }
    }
    
    return pixels;
}

// https://github.com/syncopika/funSketch/blob/master/src/filters/saturation.js
function saturate(pixels){
    const saturationValue = 2.5;
    const d = pixels.data;
    const lumR = .3086;
    const lumG = .6094;
    const lumB = .0820;

    //one of these equations per r,g,b
    const r1 = (1 - saturationValue) * lumR + saturationValue;
    const g1 = (1 - saturationValue) * lumG + saturationValue;
    const b1 = (1 - saturationValue) * lumB + saturationValue;

    //then one of these for each
    const r2 = (1 - saturationValue) * lumR;
    const g2 = (1 - saturationValue) * lumG;
    const b2 = (1 - saturationValue) * lumB;

    for(let i = 0; i < d.length; i += 4){
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        d[i] = r * r1 + g * g2 + b * b2;
        d[i + 1] = r * r2 + g * g1 + b * b2;
        d[i + 2] = r * r2 + g * g2 + b * b1;
    }

    return pixels;
}

document.getElementById('imageFilters').addEventListener('change', (evt) => {
    if(evt.target.value === "") return;
    
    const filterName = evt.target.value;
    const canvas = document.getElementById('liveryCanvas');
    const ctx = canvas.getContext('2d');
    const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    let filteredData = pixelData;
    switch(filterName){
        case 'invert':
            filteredData = invertColor(pixelData);
            break;
        case 'mosaic':
            filteredData = mosaicFilter(pixelData);
            break;
        case 'saturate':
            filteredData = saturate(pixelData);
            break;
        default:
            break;
    }
    
    ctx.putImageData(filteredData, 0, 0);
});