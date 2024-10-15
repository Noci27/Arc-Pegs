var tickRate = 200/3; //50/3 = 60fps
var moveIntervalID;
document.addEventListener("keydown", (event) => {if(event.key == "Control"){speedUp()}});   //speed-up when ctrl pressed
function speedUp(){
    clearInterval(moveIntervalID);
    tickRate = 1;
    start();
}

document.addEventListener("keyup", speedDown);
function speedDown(){
    clearInterval(moveIntervalID);
    tickRate = 200/3;
    start();
}

function start(){
    clearInterval(moveIntervalID);  //so it doesn't speed up when pressed again
    moveIntervalID = setInterval(move, tickRate);   //update the canvas
}

let d = new Ball(310, 220, 20);
function move(){
    // globTimer++;
    d.update();
    redrawCanvas();

    d.showPath();
    // console.log(brickCollisionPaths);
}

function softReset(){
    clearInterval(moveIntervalID);
    d.PoX = 310;
    d.PoY = 220;
    d.Vx = 2;
    d.Vy = 0;
    d.update();
    redrawCanvas();
}

function hardReset(){
    clearInterval(moveIntervalID);
    d.PoX = 310;
    d.PoY = 220;
    d.Vx = 2;
    d.Vy = 0;
    d.update();
    brickData = [];
    brickCollisionPaths = [];
    slopeData = [];
    // ballsData.splice(1, ballsData.length - 1);
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

// new Slope(100, 500, 500, 500);
// new Brick(500,300,200,100);
// ctx.rotate(Math.PI /25);
// new Brick(500,400,200,100);
// ctx.resetTransform();