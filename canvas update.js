var tickRate = 50/3; //50/3 = 60fps
var moveIntervalID;
var ctrlPressed = false;
document.addEventListener("keydown", (e) => {if(e.ctrlKey){speedUp()}});   //speed-up when ctrl pressed
function speedUp(){
    clearInterval(moveIntervalID);
    tickRate = 1;
    ctrlPressed = true;
    start();
}

document.addEventListener("keyup", (e) => {if(ctrlPressed && !e.ctrlKey){speedDown()}}); //only speed-down if ctrl was released
function speedDown(){
    clearInterval(moveIntervalID);
    tickRate = 50/3;
    ctrlPressed = false;
    start();
}

function start(){
    clearInterval(moveIntervalID);  //so it doesn't speed up when pressed again
    moveIntervalID = setInterval(move, tickRate);   //update the canvas
}

let d = new Ball(1310, 120, 20);
function move(){
    // globTimer++;
    d.update();
    redrawCanvas();

    // d.showPath();
    // console.log(brickCollisionPaths);
}

function softReset(){
    clearInterval(moveIntervalID);
    let ball = ballsData[0];    //reset both ball and ballsdata
    ball.PoX = 1310;
    ball.PoY = 120;
    ball.Vx = -5;
    ball.Vy = 0;
    d.PoX = 1310;
    d.PoY = 120;
    d.Vx = -5;
    d.Vy = 0;

    redrawCanvas();
}

function hardReset(){
    clearInterval(moveIntervalID);
    let ball = ballsData[0];
    ball.PoX = 1310;
    ball.PoY = 120;
    ball.Vx = -5;
    ball.Vy = 0;
    d.PoX = 1310;
    d.PoY = 120;
    d.Vx = -5;
    d.Vy = 0;
    
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

// new Slope(1150, 400, 1350, 200);