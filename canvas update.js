var tickRate = 50/3; //50/3 = 60fps
// var globTimer = 0;
var camera = null;
var d = null;
var ballInitial = null;
var moveIntervalID;
var ctrlPressed = false;
const hotkeyMenu = document.getElementById("hotkeyMenu");
const materialChangeStuff = document.getElementById("googleMaterialFuckeryWizardry");

//-----Hotkeys and stuff-----
//maybe add an overly complicated secret hotkey later
document.addEventListener("keydown", (e) => {
    switch (e.key){
        case " ":   //starts/pauses simulation
            startButton();
        break;

        case "r":
            softReset();
        break;

        case "R":
            hardReset();
        break;

        case "ArrowLeft":
            camera.move(-15, 0);
            redrawCanvas();
        break;

        case "ArrowRight":
            camera.move(15, 0); 
            redrawCanvas();
        break;
        
        case "ArrowUp":
            camera.move(0, -15);
            redrawCanvas();
        break;
        
        case "ArrowDown":
            camera.move(0, 15);
            redrawCanvas();
        break;
        
        case "Control": //speed up simulation
            clearInterval(moveIntervalID);
            tickRate = 1;
            ctrlPressed = true;
            start();
        break;

        case "1":   //enter draw mode
            toggleDraw();
        break;

        case "2":   //enter edit mode
            toggleEdit();
        break;
        default:
            // console.log(e.key);
    }
});

document.addEventListener("keyup", (e) => {if(ctrlPressed && !e.ctrlKey){speedDown()}}); //only speed-down if ctrl was released
function speedDown(){
    clearInterval(moveIntervalID);
    tickRate = 50/3;
    ctrlPressed = false;
    start();
}

function openHotkeyMenu(){
    hotkeyMenu.showModal();
}

function warning(event){
    event.preventDefault(); //recommended
    event.returnValue = true;   //legacy support
}

//-----Camera Object Class-----
class Camera{
    constructor(x, y, dx, dy){
        this.x = typeof(x) === "number" ? x: 0; //part of screen that's shown
        this.y = typeof(y) === "number" ? y: 0;
        this.dx = typeof(dx) === "number" ? dx: fldWidth;
        this.dy = typeof(dy) === "number" ? dy: fldHeight;
        this.cameraMoveBox = {x: this.dx * 0.2, y: this.dy * 0.3, dx: this.dx * 0.6, dy: this.dy * 0.4, path: new Path2D()};    //rectangle that handles automatic camera movement
        this.cameraMoveBox.path.rect(this.cameraMoveBox.x, this.cameraMoveBox.y, this.cameraMoveBox.dx, this.cameraMoveBox.dy);

        this.xInitial = this.x;  //const for reset method
        this.yInitaial = this.y;
        ctx.translate(-this.x, -this.y);
    }
    move(x, y){    //shifts the visible part of screen by specified amount
        ctx.translate(-x, -y);
        this.x += x;
        this.y += y;
        this.cameraMoveBox.x += x;
        this.cameraMoveBox.y += y;
        for(let dragObject of dragObjects){ //move all drag objects
            let currPosX = JSON.parse(dragObject.style.left.slice(0, -2));
            let currPosY = JSON.parse(dragObject.style.top.slice(0, -2));
            dragObject.style.left = `${currPosX - x}px`;
            dragObject.style.top = `${currPosY - y}px`;
        }
        this.cameraMoveBox.path = new Path2D();   //update path for debugging
        this.cameraMoveBox.path.rect(this.cameraMoveBox.x, this.cameraMoveBox.y, this.cameraMoveBox.dx, this.cameraMoveBox.dy);
    }
    reset(){    //reset all camera transformations
        this.move(this.xInitial - this.x, this.yInitaial - this.y);
    }
    draw(){     //show camera boundaries
        ctx.lineWidth = 1;
        ctx.moveTo(this.cameraMoveBox.x, this.cameraMoveBox.y);
        ctx.strokeStyle = "rgb(29, 128, 102)"
        ctx.stroke(this.cameraMoveBox.path);
    }
}

//-----Most important functions that the game wouldn't work without-----
function initializeCanvas(){
    let width = document.getElementById("canvas-container").scrollWidth;
    field.width = width;
    drawLayer.width = width;
    let height = document.getElementById("canvas-container").scrollHeight;
    field.height = height;
    drawLayer.height = height;
    fldHeight = height;
    fldWidth = width;
    camera = new Camera();
    // camera.draw();
    d = new Ball(310, 320, 20);
    ballInitial = d.getData();
}
initializeCanvas();

function redrawCanvas(){
    ctx.clearRect(camera.x,camera.y,fldWidth,fldHeight);  //clear screen
    for(const brick of brickData){    //redraw all bricks
        draw(brick);
    }
    for(const slope of slopeData){  //redraw all slopes
        draw(slope);
    }
    for(const peg of pegData){    //redraw all pegs
        draw(peg);
    }
    for(const ball of ballsData){    //redraw all balls
        draw(ball);
    }
    if(isDrawing == true){  //redraw previews
        ctx.fillStyle = "hsla(0, 0%, 10%, 0.3)";
        ctx.strokeStyle = "hsla(0, 0%, 10%, 0.3)";
        switch(selectedShape){
            case 2:
                ctx.fillRect(startX, startY, endX - startX, endY - startY);
            break;

            case 3:
                draw({shape: 3, Sx: startX, Sy: startY, Ex: endX, Ey: endY});
            break;

            case 4:
                ctx.beginPath();
                ctx.arc(endX, endY, 10, 0, 2 * Math.PI);
                ctx.fill();
            break;
        }
    }
    // camera.draw();
}

function move(){
    // globTimer++;
    d.update();
    redrawCanvas();
    // d.showPath();
    // console.log(d.getData());
}

//-----Control buttons on the side-----
function startButton(){
    if(moveIntervalID){
        pause();
        materialChangeStuff.innerHTML = "play_arrow";
    }
    else{
        start();
        materialChangeStuff.innerHTML = "pause";
    }
}

function start(){
    if(dropbox.style.zIndex == 99){ //exit all other modes
        toggleEdit();
    }
    clearInterval(moveIntervalID);  //so it doesn't speed up when pressed again
    moveIntervalID = setInterval(move, tickRate);   //update the canvas
}

function pause(){
    clearInterval(moveIntervalID);
    moveIntervalID = 0; //to determine wether or not simulation is running
}

function softReset(){
    pause();
    materialChangeStuff.innerHTML = "play_arrow";
    ballsData = [];
    d = new Ball(310, 320, 20);

    camera.reset();
    redrawCanvas();
}

function hardReset(){
    pause();
    materialChangeStuff.innerHTML = "play_arrow";
    brickData = [];
    slopeData = [];
    pegData = [];
    ballsData = [];
    for(let obecjt of dragObjects){
        dropbox.removeChild(obecjt);
    }
    dragObjects = [];

    d = new Ball(310, 320, 20);
    camera.reset();
    redrawCanvas();
    window.removeEventListener("beforeunload", warning);    //remove listener for better performance and user experience
}

function getBoard(){
    let board = JSON.stringify({balls: ballsData, bricks: brickData, slopes: slopeData, pegs: pegData}, null, "\t");
    navigator.clipboard.writeText(board);
    console.log(board);
}

function putBoard(board){
    if(board){
        ballsData = board.balls;
        brickData = board.bricks;
        slopeData = board.slopes;
        pegData = board.pegs;
        redrawCanvas();
    }
}

putBoard();