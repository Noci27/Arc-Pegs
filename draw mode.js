var isActive = false;
var startX, startY, endX, endY;
var isDrawing = false;
var selectedShape = 0;
const activeText = document.getElementById("activeText");
const assets = document.getElementsByName("shape");
const radioImages = document.getElementsByTagName("img");

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

function updateSelected(shape){
    selectedShape = shape;
}

field.addEventListener("mousedown", (event) => {
    if(isActive == true){
        startX = event.offsetX;
        startY = event.offsetY;
        endX = startX;  //so you don't get wrong previews on press
        endY = startY;
        isDrawing = true;   //is currently drawing
    }
})

field.addEventListener("mouseup", () => {
    if(isDrawing == true){
        switch(selectedShape){
            case 2: //block
                if(endX < startX){  //switch corners if drawn the wrong way so hitbox works
                    let dummy = startX;
                    startX = endX;
                    endX = dummy;
                }
                if(endY < startY){
                    let dummy = startY;
                    startY = endY;
                    endY = dummy;
                }
                let width = endX - startX;
                let height = endY - startY;
                new Brick(startX, startY, width, height);
            break;
            case 3: //slope
                ctx.strokeStyle = "black";
                new Slope(startX, startY, endX, endY);
            break;
        }
        isDrawing = false;
    }
})

field.addEventListener("mousemove", showPreview);
function showPreview(event){
    if(isDrawing == true){
        endX = event.offsetX;
        endY = event.offsetY;
        redrawCanvas();
    }
}

field.addEventListener("mousemove", updateCoords);  //coordinats at the top
function updateCoords(event){
    let xCoord = document.getElementById("xCoords");
    xCoord.innerText = "x:" + event.offsetX;
    let yCoord = document.getElementById("yCoords");
    yCoord.innerText = "y:" + event.offsetY;
}