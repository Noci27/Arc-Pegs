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
var dragObjects = new Array;
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
function startPreview(event){
    if(isActive == true){
        startX = camera.x + event.offsetX;
        startY = camera.y + event.offsetY;
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

function dragCanvas(event){
    camera.move(-event.movementX, -event.movementY);
    for(let dragObject of dragObjects){
        currPosX = JSON.parse(dragObject.style.left.slice(0, -2));
        currPosY = JSON.parse(dragObject.style.top.slice(0, -2));
        dragObject.style.left = `${currPosX + event.movementX}px`;
        dragObject.style.top = `${currPosY + event.movementY}px`;
    }
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

drawLayer.addEventListener("mousemove", (event) => {updateCoords(event);showPreview(event)});
function showPreview(event){
    if(isDrawing == true){
        endX = camera.x + event.offsetX;
        endY = camera.y + event.offsetY;
        redrawCanvas();
    }
}

function updateCoords(event){
    let xCoord = document.getElementById("xCoords");
    xCoord.innerText = "x: " + (camera.x + event.offsetX);
    let yCoord = document.getElementById("yCoords");
    yCoord.innerText = "y: " + (camera.y + event.offsetY);
}

document.addEventListener("wheel", updateSelectionWheel, {passive: true});
function updateSelectionWheel(event){
    if(isActive){
        selectedShape += Math.sign(event.deltaY);
        selectedShape = ((selectedShape - 2 + 3) % 3) + 2; // cycles through 2, 3, 4
        selectionWheel.style.backgroundImage = `conic-gradient(from ${300 + (selectedShape - 2) * 120}deg, rgba(255, 255, 255, 0.8) 120deg, transparent 120deg 360deg)`;
        assets[selectedShape - 2].checked = true;
        if(!grown){ //only grow when not already visible
            selectionWheel.style.left = `calc(${event.x}px - 5rem)`;
            selectionWheel.style.top = `calc(${event.y}px - 5rem)`;
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

dropbox.addEventListener("dragover", (e) =>{
    e.preventDefault();
})

function getMouseOffset(event){
    mouseOffsetX = event.offsetX;
    mouseOffsetY = event.offsetY;
}

function dragElement(event){
    currentOffsetX = JSON.parse(event.target.style.left.slice(0, -2));   //reset variables
    currentOffsetY = JSON.parse(event.target.style.top.slice(0, -2));
    let translationX = event.offsetX - mouseOffsetX;
    let translationY = event.offsetY - mouseOffsetY;
    currentOffsetX += translationX;
    currentOffsetY += translationY;
    event.target.style.left = `${currentOffsetX}px`;
    event.target.style.top = `${currentOffsetY}px`;

    for(let brick of brickData){    //find and move correct brick
        if(event.target.id == brick.id){
            brick.x += translationX;
            brick.y += translationY;
            break;
        }
    }
    redrawCanvas();
}