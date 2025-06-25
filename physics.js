const field = document.getElementById("field");
const ctx = field.getContext("2d"); //gives tools for drawing
const fldWidth = field.width;
const fldHeight = field.height;
const gravity = 1.05;
const friction = 1.2;
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
        this.Vx = 5;
        this.Vy = 0;
        this.HSpeed = Math.hypot(this.Vx, this.Vy);
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

        let dy = this.PoY + this.Vy + this.radus * Math.sign(this.Vy);  //next intended position
        if(!ctx.isPointInPath(fieldCollission, this.PoX, dy)){    //bounce of level boundaries
            this.Vy *= -1;
            if(this.Vy > -1 && Math.sign(this.Vy) == -1){   //stick to ground if speed is to low
                this.Vy = 0;
            }
            else{   //so speed actually converges
                this.Vy += gravity;
            }
        }
        
        //-----Horizontal Movement-----
        let dx = this.PoX + this.Vx + this.radus * Math.sign(this.Vx);
        if(!ctx.isPointInPath(fieldCollission, dx, this.PoY)){    //bounce of level boundaries
            this.Vx *= -1;
        }
        
        //-----Slope Collision-----
        let slopeHit = false;   //put outside loop because slopeData can be empty
        let [movingNormalX, movingNormalY] = normal(this.Vx, this.Vy);  //normal to speed vector
        for(const slope of slopeData){
            let {Sx: sx, Sy: sy, Ex: ex, Ey: ey} = slope;
            //search for overlap with SAT
            for(let k = 0; k < 2; k++){ //check both sides of slope
                let axisCheckX, axisCheckY;
                let moveBoxMin = Number.MAX_SAFE_INTEGER;   //bounds of 1D projection
                let moveBoxMax = Number.MIN_SAFE_INTEGER;
                let slopeProjectionMin, slopeProjectionMax;
                if(k == 0){ //check normal first because it's less likely for overlap
                    [axisCheckX, axisCheckY] = normal((ex - sx), (ey - sy));  //destructering output
                    slopeProjectionMax = dotP(axisCheckX, axisCheckY, sx, sy);
                    slopeProjectionMin = slopeProjectionMax;   //because slope ⊥ normal (only applies in first case)
                }
                else{
                    axisCheckX = ex - sx;
                    axisCheckY = ey - sy;
                    slopeProjectionMax = dotP(axisCheckX, axisCheckY, sx, sy);
                    slopeProjectionMin = dotP(axisCheckX, axisCheckY, ex, ey);
                    if(slopeProjectionMax < slopeProjectionMin){    //switch variables if in wrong order
                        slopeProjectionMin ^= slopeProjectionMax;
                        slopeProjectionMax ^= slopeProjectionMin;
                        slopeProjectionMin ^= slopeProjectionMax;
                    }
                }
                for(let i = 0; i < 2; i++){ //calculate 1D projection of ball movebox™
                    for(let j = -1; j < 2; j += 2){
                        let cornerX = this.PoX + i * (this.HSpeed * movingNormalY) + j * (this.radus * movingNormalX);
                        let cornerY = this.PoY + i * (this.HSpeed * movingNormalX * -1) + j * (this.radus * movingNormalY);   //get normalized speed vector back
                        let cornerProjection = dotP(axisCheckX, axisCheckY, cornerX, cornerY);
                        if(cornerProjection < moveBoxMin){
                            moveBoxMin = cornerProjection;
                        }
                        if(cornerProjection > moveBoxMax){
                            moveBoxMax = cornerProjection;
                        }
                    }
                }
                if(!((slopeProjectionMin > moveBoxMin && slopeProjectionMin < moveBoxMax)||(moveBoxMin > slopeProjectionMin && moveBoxMin < slopeProjectionMax))){
                    break;  //stop if gap is found
                }
                if(k == 1){
                    let [normalX, normalY] = normal((ex-sx), (ey-sy));
                    let scalar = 2 * dotP(this.Vx, this.Vy, normalX, normalY);  //mirror moving vector
                    //using Gauss elimination to find point of impact
                    let aa = this.Vx;
                    let ab = -(ex-sx);
                    if(ab == 0){    //prevent division by 0
                        ab = 0.01;
                    }
                    let ba = this.Vy;
                    let bb = -(ey-sy);
                    let t = sx - (this.PoX + this.radus * Math.sign(scalar) * normalX); //adding radius of ball
                    let r = sy - (this.PoY + this.radus * Math.sign(scalar) * normalY);

                    aa /= ab;
                    t /= ab;
                    ba -= bb * aa;
                    r -= bb * t;
                    r /= ba;

                    this.PoX += r * this.Vx;    //go to point of impact
                    this.PoY += r * this.Vy;

                    this.Vx -= scalar * normalX;    //translate vector correct way
                    this.Vy -= scalar * normalY
                    this.PoX += (1 - r) * this.Vx;   //move rest of way
                    this.PoY += (1 - r) * this.Vy;
                    slopeHit = true;
                }
            }
            if(slopeHit){
                break;  //since no movement is left after bounce/ may result in tunneling
            }
        }
        
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
                    if(bottomSideVariable == 0 && this.Vy < 1){    //stick if hit top side and speed is low enough
                        this.Vy = 0;
                    }
                    else{
                        this.Vy *= -1;
                    }
                }
            }
        }

        //-----Rotation uhhhhhhhhhhh-----
        this.rot += Math.PI / 180 * this.Vx;    //angle in degrees
        
        this.HSpeed = Math.hypot(this.Vx, this.Vy); //update HSpeed
        var circle = {shape: 1, PoX: this.PoX, PoY: this.PoY, Vx: this.Vx, Vy: this.Vy, rad: this.radus, rot: this.rot};
        draw(circle);   //redraws the circle
        ballsData[0] = circle;  //update info in ballsData
    }
    showPath(){
        ctx.lineWidth = 2;
        // let slope = x => {
        //     return this.Vy / this.Vx * x + (this.PoY - this.Vy / this.Vx * this.PoX);   //function of the movement
        // } 
        // let path = {shape: 3, Sx: this.PoX, Sy: this.PoY, Ex: this.PoX + Math.sign(this.Vx) * 500, Ey: slope(this.PoX + Math.sign(this.Vx) * 500), color: "green"};
        // draw(path);

        ctx.strokeStyle = "red";
        ctx.beginPath();
        ctx.moveTo(this.PoX, this.PoY);
        ctx.lineTo(this.PoX + this.Vx, this.PoY + this.Vy);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.PoX + this.Vx, this.PoY + this.Vy, this.radus, 0 , 2 * Math.PI);
        ctx.stroke();

        ctx.strokeStyle = "orange";
        let cornerX = this.PoX - this.radus;
        ctx.translate(this.PoX, this.PoY);
        ctx.rotate(Math.acos(this.Vy / this.HSpeed) * (this.Vx < 0 ? 1:-1));
        ctx.translate(-this.PoX, -this.PoY);
        ctx.strokeRect(cornerX, this.PoY, 2 * this.radus * ((cornerX > this.PoX) ? -1:1), this.HSpeed);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    getData(){
        let data = {X: this.PoX, Y: this.PoY, VSpeed: this.Vy, XSpeed:this.Vx, HSpeed: this.HSpeed};
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
        if(!(this.Ex - this.Sx == 0 && this.Ey - this.Sy == 0)){   //ignore if slope's vector is 0 (no slope to draw)
            var line = {shape: 3, Sx: this.Sx, Sy: this.Sy, Ex: this.Ex, Ey: this.Ey, color: "black"};
            draw(line);
            slopeData.push(line);
        }
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
            grad.addColorStop(0, "lightgreen");
            grad.addColorStop(1, "rgb(0, 185, 9)");
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