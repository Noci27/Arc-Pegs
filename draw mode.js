var isActive = false;
var startX, startY, endX, endY;
var isDrawing = false;
var selectedShape = 2;
const activeText = document.getElementById("activeText");
const assets = document.getElementsByName("shape");
const radioImages = document.querySelectorAll("[type=radio] + img");
const selectionWheel = document.getElementById("selectionWheel");
const selectionWheelImages = document.querySelectorAll("#selectionWheel img")
const selectionWheelGrow = [{scale: 0}, {scale: 1}];    //animation keyframes
var grown = false;
const dropbox = document.getElementById("editLayer");
var dragObjects = new Array;    //all dragable html elements
var currentOffsetX = 0; //used for moving objects
var currentOffsetY = 0;
var mouseOffsetX = 0;
var mouseOffsetY = 0;

function toggleDraw(){
    if(dropbox.style.zIndex == 99){ //exit all other modes
        toggleEdit();
    }
    if(isActive == false){
        isActive = true;
        activeText.style.color = "rgb(17, 255, 0)";
        activeText.innerText = "Draw";
        for(let asset of assets){
            asset.disabled = false;
        }
        for(image of radioImages){
            image.style.opacity = 1;
        }
    }
    else{
        isActive = false;
        activeText.style.color = "red";
        activeText.innerText = "none";
        for(let asset of assets){
            asset.disabled = true;
            asset.checked = false;
        }
        for(image of radioImages){
            image.style.opacity = 0.5;
        }
    }
}

function toggleEdit(){  //move edit layer to front
    if(isActive){
        toggleDraw();
    }
    if(dropbox.style.zIndex == 0){
        dropbox.style.zIndex = 99;
        activeText.style.color = "rgb(17, 255, 0)";
        activeText.innerText = "Edit";
    }
    else{
        dropbox.style.zIndex = 0;
        activeText.style.color = "red";
        activeText.innerText = "none";
    }
}

function updateSelected(shape){     //used when clicking on radio images
    selectedShape = shape;
}

drawLayer.addEventListener("mousedown", startPreview);
function startPreview(e){
    if(isActive == true){
        startX = camera.x + e.offsetX;
        startY = camera.y + e.offsetY;
        endX = startX;  //so you don't get wrong previews on press
        endY = startY;
        isDrawing = true;   //is currently drawing
        redrawCanvas();
    }
}

drawLayer.addEventListener("mousedown", () => {
    if(!isActive){
        drawLayer.addEventListener("mousemove", dragCanvas);
        document.addEventListener("mouseup", () => {drawLayer.removeEventListener("mousemove", dragCanvas)});
    }
});

function dragCanvas(e){
    camera.move(-e.movementX, -e.movementY);
    redrawCanvas();
}

drawLayer.addEventListener("mouseup", () => {
    if(isDrawing == true){
        switch(selectedShape){
            case 2: //block
                if(endX < startX){  //switch corners if drawn the wrong way so hitbox works using XOR
                    startX ^= endX;
                    endX ^= startX;
                    startX ^= endX;
                }
                if(endY < startY){
                    startY ^= endY;
                    endY ^= startY;
                    startY ^= endY;
                }
                let width = endX - startX;
                let height = endY - startY;
                new Brick(startX, startY, width, height);
            break;
            case 3: //slope
                if(endX < startX){  //switch points if drawn right to left so drag element works
                    startX ^= endX;
                    endX ^= startX;
                    startX ^= endX;
                    startY ^= endY;
                    endY ^= startY;
                    startY ^= endY;
                }
                new Slope(startX, startY, endX, endY);
            break;
            case 4: //peg
                new Peg(endX, endY);
            break;
        }
        isDrawing = false;
    }
    if(brickData.concat(pegData, slopeData)[0]){   //add listener to prevent losing levels
        window.addEventListener("beforeunload", warning);
    }
})

drawLayer.addEventListener("mousemove", showPreview);
function showPreview(e){
    if(isDrawing == true){
        endX = camera.x + e.offsetX;
        endY = camera.y + e.offsetY;
        redrawCanvas();
    }
}

container.addEventListener("mousemove", updateCoords);
function updateCoords(e){
    let xCoord = document.getElementById("xCoords");
    xCoord.innerText = "x: " + (camera.x + e.offsetX);
    let yCoord = document.getElementById("yCoords");
    yCoord.innerText = "y: " + (camera.y + e.offsetY);
}

document.addEventListener("wheel", updateSelectionWheel, {passive: true});
function updateSelectionWheel(e){
    if(isActive){
        selectedShape += Math.sign(e.deltaY);
        selectedShape = ((selectedShape - 2 + 3) % 3) + 2; // cycles through 2, 3, 4
        selectionWheel.style.backgroundImage = `conic-gradient(from ${300 + (selectedShape - 2) * 120}deg, rgba(255, 255, 255, 0.8) 120deg, transparent 120deg 360deg)`;
        assets[selectedShape - 2].checked = true;
        if(!grown){ //only grow when not already visible
            selectionWheel.style.left = `calc(${e.x}px - 5rem)`;
            selectionWheel.style.top = `calc(${e.y}px - 5rem)`;
            selectionWheel.animate(selectionWheelGrow, {duration: 100, fill: "forwards"});
            grown = true;
        }
    }
}

document.addEventListener("mousedown", shrink);
function shrink(){
    if(grown){  //only play animation when already visible
        selectionWheel.animate(selectionWheelGrow, {duration: 100, fill: "forwards", direction: "reverse"});
        grown = false;
    }
}

function getMouseOffset(e){
    let currentDragObeject = e.target;  //object that matters
    container.style.cursor = "move";
    currentDragObeject.style.zIndex = 1;
    document.addEventListener("mousemove", dragElement);
    document.addEventListener("mouseup", stopDrag, {once: true});

    function stopDrag(){    //this function now has acces to variables in above function, <3 js
        document.removeEventListener("mousemove", dragElement);
        container.style.cursor = "pointer";
        currentDragObeject.style.zIndex = 0;
    }

    function dragElement(e){
        currentOffsetX = currentDragObeject.offsetLeft;   //reset variables
        currentOffsetY = currentDragObeject.offsetTop;    //the current position of the elemen
        currentOffsetX += e.movementX;
        currentOffsetY += e.movementY;
        currentDragObeject.style.left = `${currentOffsetX}px`;
        currentDragObeject.style.top = `${currentOffsetY}px`;
    
        for(let object of brickData.concat(pegData, ballsData)){    //find and move correct element
            if(currentDragObeject.id == object.id){
                object.x += e.movementX;
                object.y += e.movementY;
                break;
            }
        }
        for(let slope of slopeData){
            if(currentDragObeject.id == slope.id){
                slope.Sx += e.movementX;
                slope.Sy += e.movementY;
                slope.Ex += e.movementX;
                slope.Ey += e.movementY;
                break;
            }
        }
        redrawCanvas();
    }
}


function dim(e){
    for(let object of brickData.concat(slopeData, pegData, ballsData)){    //find and recolour correct element
        if(e.target.id == object.id){
            object.colorBrightness = 35;
            break;
        }
    }
    redrawCanvas();
}

function unDim(e){
    for(let object of brickData.concat(slopeData, pegData, ballsData)){    //find and recolour correct element
        if(e.target.id == object.id){
            object.colorBrightness = 50;
            break;
        }
    }
    redrawCanvas();
}