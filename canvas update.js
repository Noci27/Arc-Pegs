var tickRate = 50/3; //50/3 = 60fps
// var globTimer = 0;
let d = new Ball(310, 120, 20);
const ballInitial = d.getData();
var moveIntervalID;
var ctrlPressed = false;
const hotkeyMenu = document.getElementById("hotkeyMenu");

//-----Hotkeys-----
//maybe add an overly complicated secret hotkey later
document.addEventListener("keydown", (e) => {
    switch (e.key){
        case "s":   //starts simulation
        case "S":
            start();    
        break;
        
        case "p":   //pauses simulation
        case "P":
            pause();
        break;

        case "d":
        case "D":
            toggleDraw();
        break;

        case "r":
            softReset();
        break;

        case "R":
            hardReset();
        break;

        case "Control": //speed up simulation
            clearInterval(moveIntervalID);
            tickRate = 1;
            ctrlPressed = true;
            start();
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

//-----Most important functions that the game wouldn't work without-----
function move(){
    // globTimer++;
    d.update();
    redrawCanvas();
    // d.showPath();
    // console.log(d.getData());
}

function openHotkeyMenu(){
    hotkeyMenu.showModal();
}

function start(){
    clearInterval(moveIntervalID);  //so it doesn't speed up when pressed again
    moveIntervalID = setInterval(move, tickRate);   //update the canvas
}

function pause(){
    clearInterval(moveIntervalID);
}

function softReset(){
    clearInterval(moveIntervalID);
    let ball = ballsData[0];    //reset both ball and ballsdata
    ball.PoX = ballInitial.X;
    ball.PoY = ballInitial.Y;
    ball.Vx = ballInitial.XSpeed;
    ball.Vy = ballInitial.VSpeed;
    d.PoX = ballInitial.X;
    d.PoY = ballInitial.Y;
    d.Vx = ballInitial.XSpeed;
    d.Vy = ballInitial.VSpeed;

    redrawCanvas();
}

function hardReset(){
    clearInterval(moveIntervalID);
    let ball = ballsData[0];
    ball.PoX = ballInitial.X;
    ball.PoY = ballInitial.Y;
    ball.Vx = ballInitial.XSpeed;
    ball.Vy = ballInitial.VSpeed;
    d.PoX = ballInitial.X;
    d.PoY = ballInitial.Y;
    d.Vx = ballInitial.XSpeed;
    d.Vy = ballInitial.VSpeed;
    
    brickData = [];
    brickCollisionPaths = [];
    slopeData = [];
    ballsData.splice(1, ballsData.length - 1);   //delete every but one ball
    redrawCanvas();
}

function redrawCanvas(){
    ctx.clearRect(0,0,fldWidth,fldHeight);  //clear whole canvas
    for(const peg of brickData){    //redraw all bricks
        draw(peg);
    }
    for(const slope of slopeData){  //redraw all slopes
        draw(slope);
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
        }
    }
}

// new Slope(0, 500, fldWidth, 500); 