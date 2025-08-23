var isActive = false;
var startX, startY, endX, endY;
var isDrawing = false;
var selectedShape = 0;
const activeText = document.getElementById("activeText");
const assets = document.getElementsByName("shape");
const radioImages = document.querySelectorAll("[type=radio] + img");
const selectionWheel = document.getElementById("selectionWheel");
const selectionWheelImages = document.querySelectorAll("#selectionWheel img")
const selectionWheelGrow = [{scale: 0}, {scale: 1}];    //animation keyframes
var grown = false;

function toggleDraw(){  //change text
    if(isActive == false){
        isActive = true;
        activeText.style.color = "rgb(17, 255, 0)";
        activeText.innerText = "active";
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
        activeText.innerText = "not active";
        for(let asset of assets){
            asset.disabled = true;
            asset.checked = false;
        }
        for(image of radioImages){
            image.style.opacity = 0.5;
        }
    }
}

function updateSelected(shape){     //used when clicking on radio images
    selectedShape = shape;
}

interactiveLayer.addEventListener("mousedown", startPreview);
function startPreview(event){
    if(isActive == true){
        startX = event.offsetX;
        startY = event.offsetY;
        endX = startX;  //so you don't get wrong previews on press
        endY = startY;
        isDrawing = true;   //is currently drawing
        redrawCanvas();
    }
}

interactiveLayer.addEventListener("mouseup", () => {
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
})

interactiveLayer.addEventListener("mousemove", showPreview);
function showPreview(event){
    if(isDrawing == true){
        endX = event.offsetX;
        endY = event.offsetY;
        redrawCanvas();
    }
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

interactiveLayer.addEventListener("mousemove", updateCoords);  //coordinats at the top
function updateCoords(event){
    let xCoord = document.getElementById("xCoords");
    xCoord.innerText = "x: " + event.offsetX;
    let yCoord = document.getElementById("yCoords");
    yCoord.innerText = "y: " + event.offsetY;
}