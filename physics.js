const field = document.getElementById("field");
const ctx = field.getContext("2d"); //gives tools for drawing
const fldWidth = field.width;
const fldHeight = field.height;
// var globTimer = 0;
const gravity = 1.02;
const friction = 1; //no friction = 0.96 + smth small idk
const fieldCollission = new Path2D();
fieldCollission.rect(0, 0, fldWidth, fldHeight);
var brickData = new Array;  //holds info about pegs for redraw
var brickCollisionPaths = new Array; //holds collision objects for all pegs
var ballsData = new Array;  //holds your balls
var slopeData = new Array;  //holds info about slopes

class Ball{
    constructor(x, y, radius){
        this.PoX = x;
        this.PoY = y;
        this.radus = radius;
        this.Vy = 0;
        this.Vx = 0;
        this.rot = 0;
        var circle = {shape: 1, PoX: this.PoX, PoY: this.PoY, Vx: this.Vx, Vy: this.Vy, rad: this.radus, rot: this.rot};

        draw(circle);
        ballsData.push(circle);
    }
    update(){
        //-----Vertical Movement-----
        if(this.Vy < 0){    //only gravity downwards
            this.Vy /= gravity ** friction;
            this.Vy += 0.7;   //to get back to positiv speed
        }   //↑ bugged, needs fix
        else{
            this.Vy *= gravity;
            this.Vy += 1 - Math.log2(this.PoY) / 16;      //smoother acceleration at slow speeds
        }

        let dy = this.PoY + this.Vy + this.radus * Math.sign(this.Vy);
        if(ctx.isPointInPath(fieldCollission, this.PoX, dy) == false){    //bounce of walls
            this.Vy *= -1;
            if(this.Vy > -1){   //stick  to ground if speed is to low
                this.Vy = 0;
            }
            else{
                this.Vy += gravity;
            }
        }
        
        //-----Horizontal Movement-----
        let dx = this.PoX + this.Vx + this.radus * Math.sign(this.Vx);
        if(ctx.isPointInPath(fieldCollission, dx, this.PoY) == false){    //bounce of walls
            this.Vx *= -1;
        }
        
        //-----Slope Collision-----
        var slopeHit = false;   //put outside loop because slopeData can be empty
        for(const slope of slopeData){
            let {Sx: sx, Sy: sy, Ex: ex, Ey: ey} = slope;
            let r = this.PoX - sx;
            let s = this.PoY - sy;
            let exsx = ex - sx;
            let sbxebx = -this.Vx;
            let eysy = ey - sy;
            let sbyeby = -this.Vy;
    
            r /= exsx;
            sbxebx /= exsx;
            s -= eysy * r;
            sbyeby -= eysy * sbxebx;
            s /= sbyeby;
            r -= sbxebx * s;
            //for explanation for ↑ that, consult math.png
    
            if(s <= 1 && s >= 0 && r <= 1 && r >= 0){
                let untilHitX =  s * this.Vx;
                let untilHitY = s * this.Vy; 
                let HSpeed = Math.hypot(this.Vx, this.Vy); //radius of circle
                // console.log("Hspeed before: " + HSpeed);
                let currentCicleAngle = Math.atan(this.Vy, this.Vx);
                console.log("Enclosed angle: " + calculateLineAngle(slope, ballsData[0]) * 180 / Math.PI);
                let turnAngle = 2 * calculateLineAngle(slope, ballsData[0]);
                this.PoX += untilHitX;
                this.PoY += untilHitY;
                // console.log("Vx before: " + this.Vx);
                if(currentCicleAngle > Math.PI / 2 && currentCicleAngle < Math.PI || currentCicleAngle > 3 * Math.PI / 2){
                    this.Vx = HSpeed * Math.cos(currentCicleAngle - turnAngle);
                    this.Vy = HSpeed * Math.sin(currentCicleAngle - turnAngle);
                }   //↑ check if in 2. or 4. quadrant
                else{
                    this.Vx = HSpeed * Math.cos(currentCicleAngle + turnAngle);
                    this.Vy = HSpeed * Math.sin(currentCicleAngle + turnAngle);
                }

                if(this.Vx > -1 && this.Vx < 1){   //fix floating point imprecision
                    this.Vx = 0;
                }
                if(this.Vy > -1 && this.Vy < 1){   //stick to ground if speed is to low
                    this.Vy = 0;
                }
                // console.log("Vy after: " + this.Vy);
                // console.log("Hspeed before: " + HSpeed);

                this.PoX += (1 - s) * this.Vx;  //move the rest of the way
                this.PoY += (1 - s) * this.Vy;
                // var circle = {shape: 1, PoX: this.PoX, PoY: this.PoY, Vx: this.Vx, Vy: this.Vy, rad: this.radus, rot: this.rot};
                // draw(circle);
                slopeHit = true;
            }
        }
        console.log("\n");
        
        if(slopeHit == false){  //only update position if no slope was hit
            this.PoY += this.Vy;  
            this.PoX += this.Vx;    
        }
        
        //-----Spaghetti Block Collision Take 2-----
        for(const path of brickCollisionPaths){ //+ 0.5 * this.radus so corners work
            if(this.PoY > path.TLCornerY - 0.5 * this.radus && this.PoY < path.TLCornerY + path.dy + 0.5 * this.radus){ //hit vertical side
                let rightSideVariable = 0;  //used as width if hit right side
                if(Math.sign(this.Vx) == 1){    //left or right side
                    dx = Math.abs(this.PoX - path.TLCornerX);
                }
                else{
                    dx = Math.abs(this.PoX - (path.TLCornerX + path.dx));
                    rightSideVariable = path.dx;
                }
                if(dx < this.radus){
                    this.PoX = path.TLCornerX  + rightSideVariable - this.radus * Math.sign(this.Vx);
                    this.Vx *= -1;
                }
            }
            if(this.PoX < path.TLCornerX + path.dx + 0.5 * this.radus  && this.PoX > path.TLCornerX - 0.5 * this.radus){ //hit horizontal side
                let bottomSideVariable = 0; //used as height if bottom side is hit
                if(Math.sign(this.Vy) == 1){    //top or bottom side
                    dy = Math.abs(this.PoY - path.TLCornerY);
                }
                else{
                    dy = Math.abs(this.PoY - (path.TLCornerY + path.dy));
                    bottomSideVariable = path.dy;
                }
                if(dy < this.radus){
                    this.PoY = path.TLCornerY + bottomSideVariable - this.radus * Math.sign(this.Vy);   //set position outiside of block 
                    this.Vy *= -1;
                }
            }
        }

        //-----Rotation uhhhhhhhhhhh-----
        this.rot += Math.PI / 180 * this.Vx;    //angle in degrees
        
        var circle = {shape: 1, PoX: this.PoX, PoY: this.PoY, Vx: this.Vx, Vy: this.Vy, rad: this.radus, rot: this.rot};
        draw(circle);   //redraws the circle
        ballsData[0] = circle;  //update info in ballsData
    }
    showPath(){
        ctx.lineWidth = 2;
        // let slope = x => {
        //     return this.Vy / this.Vx * x + (this.PoY - this.Vy / this.Vx * this.PoX);   //function of the movement
        // } 
        // let path = {shape: 3, Sx: fldWidth, Sy: slope(fldWidth), Ex: 0, Ey: slope(0), color: "green"};
        // draw(path);

        ctx.strokeStyle = "red";
        ctx.beginPath();
        ctx.moveTo(this.PoX, this.PoY);
        ctx.lineTo(this.PoX + this.Vx, this.PoY + this.Vy);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.PoX + this.Vx, this.PoY + this.Vy, this.radus, 0 , 2 * Math.PI);
        ctx.stroke();
    }
    getData(){
        let data = {X: this.PoX, Y: this.PoY, VSpeed: this.Vy, HSpeed: this.Vx}
        return data;
    }
}

class Brick{
    constructor(x, y, width, height){
        this.Cx = x;
        this.Cy = y;
        this.width = width;
        this.height = height;
        var rectangle = {shape: 2, TLCornerX: this.Cx, TLCornerY: this.Cy, dx: this.width, dy: this.height, color: Math.floor(Math.random() * 360)};
        draw(rectangle);
        brickData.push(rectangle);

        var hitbox = {shape: 0, TLCornerX: this.Cx, TLCornerY: this.Cy, dx: this.width, dy: this.height}
        hitbox.shape = new Path2D();
        hitbox.shape.rect(this.Cx, this.Cy, this.width, this.height);
        brickCollisionPaths.push(hitbox);    //creates collision object
        // ctx.strokeStyle = "red";
        // ctx.stroke(rectangle.shape);   //makes collision visible
    }
}

class Slope{
    constructor(Sx, Sy, Ex, Ey){
        this.Sx = Sx;
        this.Sy = Sy;
        this.Ex = Ex;
        this.Ey = Ey;
        var line = {shape: 3, Sx: this.Sx, Sy: this.Sy, Ex: this.Ex, Ey: this.Ey, color: "black"};
        draw(line);
        slopeData.push(line);
    }
}

function draw(data){
    //always have the ID of the shape in the input -> {shape: n, ...}
    //Shapes:
    //1 = Circle -> {PosX, PosY, rad}
    //2 = Rectangle -> {TLCornerX, TLCornerY, dx, dy, color}
    //3 = Line -> {Sx, Sy, Ex, Ey, color}

    let shape = data.shape;
    switch (shape) {
        case 1:
            let {PoX: x, PoY: y, rad: r, rot: rot} = data; //destructuring object into variables
            ctx.beginPath();
            ctx.arc(x, y, r, 0 , 2 * Math.PI); //defines the circle
    
            ctx.translate(x, y);  //rotate around center
            ctx.rotate(rot);    
            ctx.translate(-x, -y);
            var grad = ctx.createRadialGradient(x - r/2, y - r/2, 1, x, y, r); 
            grad.addColorStop(0, "lightblue");
            grad.addColorStop(1, "rgb(58, 70, 183)");
            ctx.fillStyle = grad;   //makes the gradient
            
            ctx.fill(); //actually draws the circle
            ctx.setTransform(1, 0, 0, 1, 0, 0); //resets transformations
        break;

        case 2:
            let {TLCornerX: xOrigin, TLCornerY: yOrigin, dx: width, dy: height, color: color} = data;
            grad = ctx.createLinearGradient(xOrigin, yOrigin, xOrigin + width, yOrigin); 
            grad.addColorStop(0.1, "white");
            grad.addColorStop(1, "hsl(" + color + ", 87%, 50%)"); //random hue 
            ctx.fillStyle = grad;   //makes the gradient
            ctx.fillRect(xOrigin, yOrigin, width, height);

            ctx.strokeStyle = "hsl(" + color + ", 87%, 40%)";
            ctx.lineWidth = Math.log1p(height); //adjust edge width
            ctx.lineJoin = "round"; //rounded corners
            ctx.strokeRect(xOrigin, yOrigin, width, height);
        break;

        case 3:
            let {Sx: Sx, Sy: Sy, Ex: Ex, Ey: Ey, color: colour} = data;
            ctx.lineWidth = 5;
            ctx.strokeStyle = colour;
            ctx.beginPath();
            ctx.moveTo(Sx, Sy);
            ctx.lineTo(Ex, Ey);
            ctx.stroke();
        break;
    }
}

function calculateLineAngle(slopeA, slopeB){  //calculates angle between 2 intersecting line segments with dotproduct
    let {Sx: sx, Sy: sy, Ex: ex, Ey: ey} = slopeA;
    let xRun = ex - sx;
    let yRise = sy - ey;
    let {Vx: vx, Vy: vy} = slopeB;
    let xDirection = Math.sign(vx);
    if(xDirection == 0){    //because sign(0) = 0 ಠ╭╮ಠ
        xDirection = 1;
    }
    let input = xDirection * (vx * xRun + vy * yRise) / (Math.hypot(vx, vy) * Math.hypot(xRun, yRise));
    // console.log(Math.hypot(vx, vy) * Math.hypot(xRun, yRise));
    return Math.acos(input);
}