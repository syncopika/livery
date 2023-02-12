
const loc = document.getElementById("colorWheelContainer");

const colorWheel = document.createElement('canvas');
colorWheel.id = "colorWheel";
colorWheel.setAttribute('width', 200);
colorWheel.setAttribute('height', 200);

const colorWheelContext = colorWheel.getContext('2d');
const x = colorWheel.width / 2;
const y = colorWheel.height / 2;
const radius = 60;

// why 5600??
for(let angle = 0; angle <= 5600; angle++) {
    const startAngle = (angle - 2) * Math.PI / 180; //convert angles to radians
    const endAngle = (angle) * Math.PI / 180;
    colorWheelContext.beginPath();
    colorWheelContext.moveTo(x, y);
    //.arc(x, y, radius, startAngle, endAngle, anticlockwise)
    colorWheelContext.arc(x, y, radius, startAngle, endAngle, false);
    colorWheelContext.closePath();
    //use .createRadialGradient to get a different color for each angle
    //createRadialGradient(x0, y0, r0, x1, y1, r1)
    const gradient = colorWheelContext.createRadialGradient(x, y, 0, startAngle, endAngle, radius);
    gradient.addColorStop(0, 'hsla(' + angle + ', 10%, 100%, 1)');
    gradient.addColorStop(1, 'hsla(' + angle + ', 100%, 50%, 1)');
    colorWheelContext.fillStyle = gradient;
    colorWheelContext.fill();
}

// make black a pickable color 
colorWheelContext.fillStyle = "rgba(0,0,0,1)";
colorWheelContext.beginPath();
colorWheelContext.arc(10, 10, 8, 0, 2*Math.PI);
colorWheelContext.fill();

// make white pickable too (and add a black outline)
colorWheelContext.beginPath();
colorWheelContext.arc(30, 10, 8, 0, 2*Math.PI); // border around the white 
colorWheelContext.stroke();

// make sure circle is filled with #fff
colorWheelContext.fillStyle = "rgba(255,255,255,1)";
colorWheelContext.arc(30, 10, 8, 0, 2*Math.PI);
colorWheelContext.fill();

// make transparent white pickable too (and add a black outline)
//colorWheelContext.beginPath();
//colorWheelContext.arc(50, 10, 8, 0, 2*Math.PI); // border around the white 
//colorWheelContext.stroke();

// make sure circle is filled with transparent white
//colorWheelContext.fillStyle = "rgba(255,255,255,0.5)";
//colorWheelContext.arc(50, 10, 8, 0, 2*Math.PI);
//colorWheelContext.fill();

loc.appendChild(colorWheel);


document.getElementById(colorWheel.id).addEventListener('mousedown', (evt) => {
    const x = evt.offsetX;
    const y = evt.offsetY;
    
    const colorPicked = (document.getElementById(colorWheel.id).getContext('2d')).getImageData(x, y, 1, 1).data;
    
    /*correct the font color if the color is really dark
    const colorPickedText = document.getElementById('colorPicked');
    if(colorPicked[0] > 10 && colorPicked[1] > 200){
        colorPickedText.style.color = "#000";
    }else{
        colorPickedText.style.color = "#fff";
    }
    
    colorPickedText.textContent = 'rgba(' + colorPicked[0] + ',' + colorPicked[1] + ',' + colorPicked[2] + ',' + colorPicked[3] + ')';
    colorPickedText.style.backgroundColor = colorPickedText.textContent;
    */
    
    const pickedColor = 'rgba(' + colorPicked[0] + ',' + colorPicked[1] + ',' + colorPicked[2] + ',' + colorPicked[3] + ')';
    document.getElementById('colorInput').value = pickedColor;
    document.getElementById('colorInput').style.border = `3px solid ${pickedColor}`;
});