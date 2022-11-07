// some filter stuff for the canvas
function invertColor(pixels){
    let d = pixels.data;
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
    let d = pixels.data;
    let copy = new Uint8ClampedArray(d);
    
    // get dimensions 
    let width = pixels.width;
    let height = pixels.height;
    
    // change sampling size here. lower for higher detail preservation, higher for less detail (because larger chunks)
    let chunkWidth = 10;
    let chunkHeight = 10;

    for(let i = 0; i < width; i += chunkWidth){
        for(let j = 0; j < height; j += chunkHeight){
            // multiply by width because all the image data is in a single array and a row is dependent on width
            let r = copy[4 * i + 4 * j * width];
            let g = copy[4 * i + 4 * j * width + 1];
            let b = copy[4 * i + 4 * j * width + 2];
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
        default:
            break;
    }
    
    ctx.putImageData(filteredData, 0, 0);
});