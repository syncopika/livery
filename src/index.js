// TODO: 
// - allow turntable rotation toggling //if(currModel) currModel.rotateY(Math.PI / 800);
// - be able to adjust lighting?
// - implement animation control
// - improve UI

let currModel = null;
let currMeshes = {};
let currModelTextureMesh = null; // use this variable to keep track of the mesh whose texture is being edited
let currTexture = null;

const loader = new THREE.GLTFLoader();
const textureLoader = new THREE.TextureLoader();

const container = document.getElementById("modelCanvas");
const renderer = new THREE.WebGLRenderer({antialias: true, canvas: container});
const fov = 60;
const camera = new THREE.PerspectiveCamera(fov, container.clientWidth / container.clientHeight, 0.01, 1000);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcccccc);

renderer.setSize(container.clientWidth, container.clientHeight);
renderer.domElement.style.border = '1px solid #000';

//camera.position.set(0, 10, 28);
//camera.rotateOnAxis(new THREE.Vector3(1,0,0), -Math.PI/8);
scene.add(camera);

// https://discourse.threejs.org/t/solved-glb-model-is-very-dark/6258
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
hemiLight.position.set(0, 200, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight( 0xffffff );
dirLight.position.set(0, 100, -10);
scene.add(dirLight);

// set up trackball control
const controls = new THREE.TrackballControls(camera, renderer.domElement);
controls.rotateSpeed = 1.2;
controls.zoomSpeed = 1.2;
controls.panSpeed = 0.8;
//controls.noZoom = false;
//controls.noPan = false;
//controls.staticMoving = true;
//controls.dynamicDampingFactor = 0.3;

const raycaster = new THREE.Raycaster();

getModel('models/f-16.gltf', 'f16');
update();


function processGltf(name){
    return function(gltf){
        
        clearLiveryCanvas();
        
        currMeshes = {};
        
        // https://discourse.threejs.org/t/find-the-size-of-a-loaded-gltf-model/38515
        // https://stackoverflow.com/questions/14614252/how-to-fit-camera-to-object
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const { x: boxWidth, y: boxHeight, z: boxDepth } = box.getSize(new THREE.Vector3()); // Returns the width, height and depth of this box

        const camFov = fov * (Math.PI / 180); // convert to radians
        const camDist = Math.abs(Math.max(boxWidth, boxHeight) / Math.atan(camFov / 2));
        camera.position.set(0, 0, camDist);
        
        // reset trackball control target to center
        controls.target = new THREE.Vector3(0, 0, 0);

        gltf.scene.traverse((child) => {
            if(child.type === "Mesh" || child.type === "SkinnedMesh"){
                currMeshes[child.name] = {mesh: null, texture: null};
                
                // get the embedded texture and display in canvas
                const hasTexture = child.material.map !== null;
                
                if(hasTexture){
                    const texture = child.material.map.image;
                    currTexture = texture;
                    currMeshes[child.name].texture = texture;
                    
                    const canvas = document.getElementById('liveryCanvas');
                    canvas.width = texture.width;
                    canvas.height = texture.height;
                    canvas.getContext('2d').drawImage(texture, 0, 0);
                    
                    const mask = document.getElementById("maskingLayer");
                    mask.height = canvas.height;
                    mask.width = canvas.width;
                    setupMaskingLayer();

                    const meshFace = document.getElementById("meshFaceLayer");
                    meshFace.height = canvas.height;
                    meshFace.width = canvas.width;
                    setupMeshFaceLayer();
                }else{
                    currTexture = null;
                }
                
                const material = child.material.clone();
                const geometry = child.geometry.clone();
                const obj = new THREE.Mesh(geometry, material);
                
                obj.name = child.name;
                
                currMeshes[child.name].mesh = obj;
                
                currModel = obj;
                currModelTextureMesh = obj;
                
                // reminder that rotation/position/scale fields are immutable: https://github.com/mrdoob/three.js/issues/8940
                if(child.parent && currMeshes[child.parent.name]){
                    currMeshes[child.parent.name].mesh.add(obj);
                    obj.position.copy(child.position);
                    obj.rotation.copy(child.rotation);
                    obj.scale.copy(child.scale);
                }else{
                    if(child.parent && child.parent.type !== 'Scene'){
                        // some models might have children that have parents that are
                        // groups that may not exist in the model but we need to use the 
                        // assigned parent's position/rotation/scale.
                        //
                        // I experienced this when exporting some .gltf files made up 
                        // of .nif file assets that I imported into Blender (as .obj)
                        obj.position.copy(child.parent.position);
                        obj.rotation.copy(child.parent.rotation);
                        obj.scale.copy(child.parent.scale);
                    }else{
                        obj.position.copy(child.position);
                        obj.rotation.copy(child.rotation);
                        obj.scale.copy(child.scale);
                    }
                }
                
                processMesh(obj);
                
            }else if(
                child.type === "Object3D" && 
                (child.name.includes("Armature") || child.name.includes("Bone"))
            ){
                const obj3d = new THREE.Object3D();
                obj3d.position.copy(child.position);
                obj3d.rotation.copy(child.rotation);
                obj3d.scale.copy(child.scale);
                obj3d.name = child.name;
                
                currMeshes[child.name] = {mesh: obj3d, texture: null};
                
                if(child.parent && currMeshes[child.parent.name]){
                    currMeshes[child.parent.name].mesh.add(obj3d);
                }
                
                processMesh(obj3d);
            }
        });
        //console.log(currMeshes);
    }
}

/* for finding the center point among multiple meshes' positions
function getCentroid(){
    // https://math.stackexchange.com/questions/195729/finding-the-virtual-center-of-a-cloud-of-points
    // https://forum.unity.com/threads/get-centre-point-of-multiple-child-objects.131921/
    let centroidX = 0;
    let centroidY = 0;
    let centroidZ = 0;
    
    Object.values(currMeshes).forEach((mesh) => {
        centroidX += mesh.mesh.position.x;
        centroidY += mesh.mesh.position.y;
        centroidZ += mesh.mesh.position.z;
    });
    
    const numMeshes = Object.values(currMeshes).length;
    const xMean = centroidX / numMeshes;
    const yMean = centroidY / numMeshes;
    const zMean = centroidZ / numMeshes;
    
    return new THREE.Vector3(xMean, yMean, zMean);
}*/

function getModel(modelFilePath, name){
    return new Promise((resolve, reject) => {
        loader.load(
            modelFilePath,
            processGltf(name),
            // called while loading is progressing
            function(xhr){
                console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
            },
            // called when loading has errors
            function(error){
                console.log('An error happened');
                console.log(error);
            }
        );
    });
}

function processMesh(mesh){
    if(!mesh.parent){
        scene.add(mesh);
    }
    update();
}

function update(){
    requestAnimationFrame(update);
    controls.update();
    renderer.render(scene, camera);
}

function clearLiveryCanvas(){
    const canvas = document.getElementById('liveryCanvas');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

// model selection
document.getElementById('selectModel').addEventListener('change', (evt) => {
    //console.log(evt.target.value);
    for(let meshName in currMeshes){
        scene.remove(currMeshes[meshName].mesh);
    }
    getModel(`models/${evt.target.value}.gltf`, evt.target.value);
});

function resetTexture(){
    const canvas = document.getElementById('liveryCanvas');
    canvas.getContext('2d').drawImage(currTexture, 0, 0);
}
document.getElementById('resetTexture').addEventListener('click', () => {
    resetTexture();
});

function importModel(){
    // https://stackoverflow.com/questions/61763757/load-gltf-file-into-a-three-js-scene-with-a-html-input
    // https://stackoverflow.com/questions/64538909/upload-and-preview-gltf-file-3d
    fileHandler();
    
    function fileHandler(){
        //initiate file choosing after button click
        let input = document.createElement('input');
        input.type = 'file';
        input.addEventListener('change', getFile, false);
        input.click();
    }
    
    async function getFile(e){
        const reader = new FileReader();
        const file = e.target.files[0];
        
        for(let meshName in currMeshes){
            scene.remove(currMeshes[meshName].mesh);
        }
        
        reader.onload = function(evt){
            const gltfText = evt.target.result;
            loader.parse(gltfText, '', processGltf(file.name), (err) => console.log(err)); 
        }
        
        reader.readAsText(file);
    }
}
document.getElementById('importModel').addEventListener('click', importModel);

function importTexture(){
    fileHandler();
    
    // define fileHandler 
    function fileHandler(){
        //initiate file choosing after button click
        let input = document.createElement('input');
        input.type = 'file';
        input.addEventListener('change', getFile, false);
        input.click();
    }
    
    function getFile(e){
        const img = new Image();
        const reader = new FileReader();
        const file = e.target.files[0];
        if(!file.type.match(/image.*/)){
            console.log("not a valid image");
            return;
        }
        img.onload = () => {
            const canvas = document.getElementById("liveryCanvas");
            const context = canvas.getContext("2d");
            const height = canvas.height;
            const width = canvas.width;
            context.drawImage(img, 0, 0, width, height);
            
            currTexture = img;

            const mask = document.getElementById("maskingLayer");
            mask.height = canvas.height;
            mask.width = canvas.width;
            
            setupMaskingLayer();
        };
        //after reader has loaded file, put the data in the image object.
        reader.onloadend = function(){ 
            img.src = reader.result;
        };
        //read the file as a URL
        reader.readAsDataURL(file);
    }
}
document.getElementById("importTexture").addEventListener('click', () => {
    importTexture();
});

function exportTexture(){
    const canvas = document.getElementById("liveryCanvas");
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const name = prompt("please enter a name for the file");
        if(name === null) {
            return;
        }else{
            link.download = name;
            //simulate a click on the blob's url to download it 
            link.click();
        }
    });
}
document.getElementById("exportTexture").addEventListener('click', () => {
    exportTexture();
});

function updateModel(){
    // get image from canvas
    
    // create new texture from it
    const newTexture = new THREE.CanvasTexture(document.getElementById('liveryCanvas'));
    
    // update model with new texture
    const oldTexture = currModelTextureMesh.material.map;

    newTexture.flipY = false;
    currModelTextureMesh.material.map = newTexture;
}
document.getElementById('updateModel').addEventListener('click', (evt) => {
    updateModel();
});

// canvas drawing stuff
let clickX = [];
let clickY = [];
let clickDrag = [];
let clickColor = [];
let clickSize = [];
let isDrawing = false;

let isMaskBrush = false;
let maskBrushColor = 'rgba(0, 0, 0, 200)';

function brushStart(evt){
    evt.preventDefault();
    if(evt.which === 1){
        isDrawing = true;
        addClick(evt, true);
        stroke();
    }
}

function brushMove(evt){
    evt.preventDefault();
    if(isDrawing){
        addClick(evt, true);
        stroke();
    }
}

function brushStop(){
    clearClick();
    isDrawing = false;
}

function clearClick(){
    clickX = [];
    clickY = [];
    clickDrag = [];
    clickColor = [];
    clickSize = [];
}

let currBrushSize = 3;
function addClick(ptrEvt, dragging){
    const size = currBrushSize;
    const color = isMaskBrush ? maskBrushColor : document.getElementById('colorInput').value; //'rgba(0,0,0,255)';
    const x = ptrEvt.offsetX;
    const y = ptrEvt.offsetY;
    clickX.push(x);
    clickY.push(y);
    clickColor.push(color);
    clickSize.push(size);
    clickDrag.push(true);
}

function stroke(){
    const ctx = document.getElementById('liveryCanvas').getContext('2d');
    for(let i = 0; i < clickX.length; i++){        
        ctx.lineJoin = 'round';
        ctx.lineWidth = clickSize[i];
        ctx.strokeStyle = clickColor[i];
        ctx.beginPath();
        
        if(clickDrag[i] && i){
            ctx.moveTo(clickX[i-1], clickY[i-1]);
        }else{
            // single dot
            ctx.moveTo(clickX[i], clickY[i]+1);
        }
        
        ctx.lineTo(clickX[i], clickY[i]);
        ctx.closePath();
        ctx.stroke();
    }
}

const canvas = document.getElementById('liveryCanvas');
canvas.addEventListener('pointerdown', brushStart);
canvas.addEventListener('pointerup', brushStop);
canvas.addEventListener('pointermove', brushMove);
canvas.addEventListener('pointerleave', brushStop);

document.getElementById('colorInput').addEventListener('change', (evt) => {
    evt.target.style.border = '3px solid ' + evt.target.value;
});

document.getElementById('bgColorInput').addEventListener('change', (evt) => {
    scene.background = new THREE.Color(evt.target.value);
});

function getColor(evt){
    evt.preventDefault();
    if(pickColorFromTexture){
        const x = evt.offsetX;
        const y = evt.offsetY;
        
        const currCanvas = maskingLayerOn ? document.getElementById('maskingLayer') : document.getElementById('liveryCanvas');
        
        const colorPicked = (currCanvas.getContext('2d')).getImageData(x, y, 1, 1).data;
        document.getElementById('colorPickedfromTexture').textContent = `found color: rgba(${colorPicked[0]},${colorPicked[1]},${colorPicked[2]},${colorPicked[3]})`;
        document.getElementById('colorPickedfromTexture').style.backgroundColor = `rgba(${colorPicked[0]},${colorPicked[1]},${colorPicked[2]},${colorPicked[3]})`;
        
        document.getElementById('pickColorFromTexture').style.borderColor = '';
        
        if(!maskingLayerOn){
            currCanvas.addEventListener('pointerdown', brushStart);
            currCanvas.addEventListener('pointerup', brushStop);
        }else{
            currCanvas.addEventListener('pointerdown', brushStartMask);
            currCanvas.addEventListener('pointerup', brushStopMask);
        }
        
        pickColorFromTexture = false;
    }
}

document.getElementById('pickColorFromTexture').addEventListener('click', (evt) => {
    document.getElementById('pickColorFromTexture').style.borderColor = '#00ff00';
    
    pickColorFromTexture = true;
    
    const currCanvas = maskingLayerOn ? document.getElementById('maskingLayer') : document.getElementById('liveryCanvas');
    
    if(!maskingLayerOn){
        currCanvas.removeEventListener('pointerdown', brushStart);
        currCanvas.removeEventListener('pointerup', brushStop);
    }else{
        currCanvas.removeEventListener('pointerdown', brushStartMask);
        currCanvas.removeEventListener('pointerup', brushStopMask);
    }
    
    currCanvas.addEventListener('pointerdown', getColor);
});

document.getElementById('brushSize').addEventListener('change', (evt) => {
    currBrushSize = parseInt(evt.target.value);
    document.getElementById('currBrushSize').textContent = currBrushSize;
});

document.getElementById('toggleWireframe').addEventListener('click', (evt) => {
    currModelTextureMesh.material.wireframe = !currModelTextureMesh.material.wireframe;
});

// https://stackoverflow.com/questions/42309715/how-to-correctly-pass-mouse-coordinates-to-webgl
function getCoordsOnMouseClick(event){
    const target = event.target;
    const x1 = event.clientX - target.getBoundingClientRect().left;// + target.offsetWidth/2;
    const y1 = event.clientY - target.getBoundingClientRect().top;// + target.offsetHeight/2;
    const posX = (x1 * target.width) / target.clientWidth;
    const posY = (y1 * target.height) / target.clientHeight;

    const gl = target.getContext("webgl2"); // might be webgl in other browsers (not chrome)?
    const x = (posX / gl.canvas.width) * 2 - 1;
    const y = (posY / gl.canvas.height) * -2 + 1;
    
    return {x, y};
}

function setupMeshFaceLayer(){
    const meshFaceLayer = document.getElementById('meshFaceLayer');
    
    meshFaceLayer.style.position = "absolute";
    meshFaceLayer.style.top = 0;
    meshFaceLayer.style.left = 0;
    meshFaceLayer.style.display = "none";
    
    const ctx = meshFaceLayer.getContext('2d');
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.fillRect(0, 0, meshFaceLayer.width, meshFaceLayer.height);
}

function getFaceMesh(e){
    const mouseCoords = getCoordsOnMouseClick(e);
    raycaster.setFromCamera(mouseCoords, camera);
    
    const intersects = raycaster.intersectObject(currModelTextureMesh);

    // https://stackoverflow.com/questions/29274674/three-js-ray-picking-face-segments-of-plane-mesh-v69
    // https://stackoverflow.com/questions/50064556/how-to-get-intersected-face-when-raycasting-against-buffer-geometry
    // https://discourse.threejs.org/t/facevertexuvs-for-buffergeometry/23040
    // https://stackoverflow.com/questions/55334455/three-js-how-to-find-vertices-of-the-face-by-face-index
    // https://r105.threejsfundamentals.org/threejs/lessons/threejs-custom-buffergeometry.html
    // maybe helpful? https://forum.playcanvas.com/t/how-to-get-the-uv-coordinate-of-a-mesh/14135/5
    if(intersects.length > 0){
        const intersected = intersects[0];
        const obj = intersected.object;
        const face = intersected.face;

        const geometry = obj.geometry;
        const position = geometry.attributes.position;
        const uv = geometry.attributes.uv;

        // get corresponding uv coords
        const uv1 = new THREE.Vector2();
        const uv2 = new THREE.Vector2();
        const uv3 = new THREE.Vector2();
        uv1.fromBufferAttribute(uv, face.a);
        uv2.fromBufferAttribute(uv, face.b);
        uv3.fromBufferAttribute(uv, face.c);

        // convert uv coords to canvas coords for texture
        const canvas = document.getElementById("liveryCanvas");
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const t1 = {x: uv1.x * canvasWidth, y: uv1.y * canvasHeight};
        const t2 = {x: uv2.x * canvasWidth, y: uv2.y * canvasHeight};
        const t3 = {x: uv3.x * canvasWidth, y: uv3.y * canvasHeight};

        // draw the triangle out on another canvas overlaying the texture
        const meshFaceLayer = document.getElementById('meshFaceLayer');
        meshFaceLayer.style.display = '';

        const meshFaceLayerCtx = meshFaceLayer.getContext('2d');
        meshFaceLayerCtx.clearRect(0, 0, meshFaceLayer.width, meshFaceLayer.height);
        meshFaceLayerCtx.lineWidth = 2;
        meshFaceLayerCtx.beginPath();
        meshFaceLayerCtx.moveTo(t1.x, t1.y);
        meshFaceLayerCtx.lineTo(t2.x, t2.y);
        meshFaceLayerCtx.lineTo(t3.x, t3.y);
        meshFaceLayerCtx.closePath();
        meshFaceLayerCtx.stroke();
    }
}

// for selecting a mesh face and finding the corresponding texture section for that face
let selectingMeshFace = false;
document.getElementById('selectMeshFace').addEventListener('click', (evt) => {
    selectingMeshFace = !selectingMeshFace;
        
    if(selectingMeshFace){
        document.getElementById('selectMeshFace').style.borderColor = '#0f0';
        renderer.domElement.addEventListener('click', getFaceMesh);
    }else{
        const meshFaceLayer = document.getElementById('meshFaceLayer');
        meshFaceLayer.style.display = 'none';

        document.getElementById('selectMeshFace').style.borderColor = '';
        renderer.domElement.removeEventListener('click', getFaceMesh);
    }
});

// be able to select a mesh to work on (if there are multiple in the scene)
// selecting a mesh should update the currModelTextureMesh and currTexture
let selectingMesh = false;
function selectMesh(evt){
    const mouseCoords = getCoordsOnMouseClick(evt);
    raycaster.setFromCamera(mouseCoords, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    if(intersects.length > 0){
        // let's only care about the first object that's hit
        const hit = intersects[0].object;
        if(hit.name in currMeshes){
            currModelTextureMesh = currMeshes[hit.name].mesh;
            currTexture = currMeshes[hit.name].texture;
            
            // update livery canvas
            if(currTexture){
                resetTexture();
            }else{
                clearLiveryCanvas();
            }
            
            // indicate which mesh got selected by flashing wireframe
            currModelTextureMesh.material.wireframe = true;
            setTimeout(() => {
                currModelTextureMesh.material.wireframe = false;
            }, 1500);
        }
    }
}
document.getElementById('selectMesh').addEventListener('click', (evt) => {
    selectingMesh = !selectingMesh;
        
    if(selectingMesh){
        document.getElementById('selectMesh').style.borderColor = '#0f0';
        renderer.domElement.addEventListener('click', selectMesh);
    }else{
        document.getElementById('selectMesh').style.borderColor = '';
        renderer.domElement.removeEventListener('click', selectMesh);
    }
});

let canvasLocked = false;
document.getElementById('lockRotation').addEventListener('click', (evt) => {
    if(!canvasLocked){
        controls.noRotate = true;
        document.getElementById('lockRotation').style.borderColor = '#0f0';
        //evt.target.textContent = "unlock rotation";
    }else{
        controls.noRotate = false;
        document.getElementById('lockRotation').style.borderColor = '';
        //evt.target.textContent = "lock rotation";
    }
    canvasLocked = !canvasLocked;
});


// for drawing directly on the model
let isDrawingOnModel = false;
function brushStartModelDraw(evt){
    evt.preventDefault();
    if(evt.which === 1){
        isDrawingOnModel = true;
        addClickModelDraw(evt, true);
        strokeModelDraw();
    }
}

function brushMoveModelDraw(evt){
    evt.preventDefault();
    if(isDrawingOnModel){
        addClickModelDraw(evt, true);
        strokeModelDraw();
    }
}

function brushStopModelDraw(){
    clearClick();
    isDrawingOnModel = false;
}

function addClickModelDraw(ptrEvt, dragging){
    const size = currBrushSize;
    const color = document.getElementById('colorInput').value;
    
    const mouseCoords = getCoordsOnMouseClick(ptrEvt);
    raycaster.setFromCamera(mouseCoords, camera);
    
    const intersects = raycaster.intersectObject(currModelTextureMesh);
    if(intersects.length > 0){
        const intersected = intersects[0];
        
        const canvas = document.getElementById("liveryCanvas");
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const x = intersected.uv.x * canvasWidth
        const y = intersected.uv.y * canvasHeight;
        
        clickX.push(x);
        clickY.push(y);
        clickColor.push(color);
        clickSize.push(size);
        clickDrag.push(true);
    }
}

function strokeModelDraw(){
    const ctx = document.getElementById('liveryCanvas').getContext('2d');
    for(let i = 0; i < clickX.length; i++){        
        ctx.lineJoin = 'round';
        ctx.lineWidth = clickSize[i];
        ctx.strokeStyle = clickColor[i];
        ctx.beginPath();
        
        if(clickDrag[i] && i){
            ctx.moveTo(clickX[i-1], clickY[i-1]);
        }else{
            // single dot
            ctx.moveTo(clickX[i], clickY[i]+1);
        }
        
        ctx.lineTo(clickX[i], clickY[i]);
        ctx.closePath();
        ctx.stroke();
    }
    
    const newTexture = new THREE.CanvasTexture(document.getElementById('liveryCanvas'));
    newTexture.flipY = false;
    currModelTextureMesh.material.map = newTexture;
}

let drawOnModel = false;
//document.getElementById('drawOnModel').style.borderColor = '#f00';
document.getElementById('drawOnModel').addEventListener('click', (evt) => {
    const modelCanvas = renderer.domElement;
    if(!drawOnModel){
        document.getElementById('drawOnModel').style.borderColor = '#0f0';
        const modelDisplay = renderer.domElement;
        modelDisplay.addEventListener('pointerdown', brushStartModelDraw);
        modelDisplay.addEventListener('pointerup', brushStopModelDraw);
        modelDisplay.addEventListener('pointermove', brushMoveModelDraw);
        modelDisplay.addEventListener('pointerleave', brushStopModelDraw);
    }else{
        //document.getElementById('drawOnModel').style.borderColor = '#f00';
        document.getElementById('drawOnModel').style.borderColor = '';
        const modelDisplay = renderer.domElement;
        modelDisplay.removeEventListener('pointerdown', brushStartModelDraw);
        modelDisplay.removeEventListener('pointerup', brushStopModelDraw);
        modelDisplay.removeEventListener('pointermove', brushMoveModelDraw);
        modelDisplay.removeEventListener('pointerleave', brushStopModelDraw);
    }
    drawOnModel = !drawOnModel;
});

// allow toggle between smooth and flat shading
document.getElementById('toggleShading').addEventListener('change', (evt) => {
    if(evt.target.checked){
        console.log("flat shading");
        currModelTextureMesh.material.flatShading = true;
    }else{
        currModelTextureMesh.material.flatShading = false;
    }
    
    currModelTextureMesh.material.needsUpdate = true;
});

// control lighting position
document.getElementById('dirLightX').addEventListener('input', (evt) => {
    dirLight.position.x = parseInt(evt.target.value);
    document.getElementById('dirLightXVal').textContent = evt.target.value;
});

document.getElementById('dirLightY').addEventListener('input', (evt) => {
    dirLight.position.y = parseInt(evt.target.value);
    document.getElementById('dirLightYVal').textContent = evt.target.value;
});

document.getElementById('dirLightZ').addEventListener('input', (evt) => {
    dirLight.position.z = parseInt(evt.target.value);
    document.getElementById('dirLightZVal').textContent = evt.target.value;
});

document.getElementById('dirLightIntensity').addEventListener('input', (evt) => {
    dirLight.intensity = parseInt(evt.target.value);
    document.getElementById('dirLightIntensityVal').textContent = evt.target.value;
});

// handle gltf exporting
// https://github.com/mrdoob/three.js/blob/master/examples/misc_exporter_gltf.html
const exporter = new THREE.GLTFExporter();
document.getElementById('exportModel').addEventListener('click', () => {
    exporter.parse(
        scene, 
        function(gltf){
            const output = JSON.stringify(gltf, null, 2);
            
            let filename = prompt("what would you like to name the file?");
            if(!filename){
                filename = "livery-output";
            }
            filename += ".gltf";
            
            const blob = new Blob([output], {type: 'application/octet-stream'});
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();
        },
        function(err){
            console.log("an error happened on export!");
        },
        {}, // options
    );
});
