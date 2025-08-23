const field = document.getElementById("field");     //gameplay layer
const ctx = field.getContext("2d"); //gives tools for drawing
const interactiveLayer = document.getElementById("interactiveLayer");   //for UI and stuff
const interactiveLayerCtx = interactiveLayer.getContext("2d");
const fldWidth = field.width;
const fldHeight = field.height;
const gravity = 1.5;
const friction = 0.8;
const fieldCollission = new Path2D();
fieldCollission.rect(0, 0, fldWidth, fldHeight);
var ballsData = new Array;  //holds your balls
var brickData = new Array;  //holds info about bricks for redraw
var slopeData = new Array;  //holds info about slopes
var pegData = new Array;    //holds info about Pegs

class Ball{
    constructor(x, y, radius){
        this.PoX = x;
        this.PoY = y;
        this.radus = radius;
        this.Vx = 0;
        this.Vy = 0;
        this.HSpeed = Math.hypot(this.Vx, this.Vy);
        this.rot = 0;
        var circle = {shape: 1, PoX: this.PoX, PoY: this.PoY, Vx: this.Vx, Vy: this.Vy, rad: this.radus, rot: this.rot};

        draw(circle);
        ballsData.push(circle);
    }
    update(){      
        let unmovedDist = 1;  //fraction of remaining movement
        let nPoY = this.PoY + this.Vy;  //next intended position
        let nPoX = this.PoX + this.Vx;
        //-----Peg Collision-----
        for(let peg of pegData){
            let distance = Math.hypot((nPoX - peg.x), (nPoY - peg.y));
            if(distance < this.radus + peg.r){
                let translationX = (nPoX - peg.x) * (this.radus + peg.r - distance) / distance;
                let translationY = (nPoY - peg.y) * (this.radus + peg.r - distance) / distance;
                this.PoX += this.Vx + translationX;   //move outside of peg
                this.PoY += this.Vy + translationY;
                translationX /= (this.radus + peg.r - distance); //normalize vector
                translationY /= (this.radus + peg.r - distance);
                let scalar = 2 * friction * dotP(this.Vx, this.Vy, translationX, translationY); //mirror moving vector
                this.Vx -= scalar * translationX;
                this.Vy -= scalar * translationY;
                unmovedDist = 0;
                nPoX = this.PoX;
                nPoY = this.PoY;
            }
        }

        //-----Slope Collision-----
        if(unmovedDist != 0){
            let slopeDataLength = slopeData.length;
            for(let i = 0; i < slopeDataLength; i++){
                let {Sx: sx, Sy: sy, Ex: ex, Ey: ey} = slopeData[i];
                let slopage = [[sx, sy], [ex, ey]];
                if(checkOverlapCircle([nPoX, nPoY, this.radus], slopage)){
                    let [normalX, normalY] = normal((ex-sx), (ey-sy));
                    let scalar = 2 * friction * dotP(this.Vx, this.Vy, normalX, normalY);  //mirror moving vector + dampening
                    //using Gauss elimination to find point of impact
                    let aa = this.Vx * unmovedDist;
                    let ab = -(ex-sx);
                    if(ab == 0){    //prevent division by 0
                        ab = 0.01;
                    }
                    let ba = this.Vy * unmovedDist;
                    if(ba == 0){
                        ba = 0.01;
                    }
                    let bb = -(ey-sy);
                    let t = sx - (this.PoX + this.radus * Math.sign(scalar) * normalX); //adding radius of ball
                    let r = sy - (this.PoY + this.radus * Math.sign(scalar) * normalY);
    
                    aa /= ab;
                    t /= ab;
                    ba -= bb * aa;
                    r -= bb * t;
                    r /= ba;

                    if(r < -0.5){  //happens when hitting edges
                        let dist1 = Math.hypot((this.PoX - sx), (this.PoY - sy));
                        let dist2 = Math.hypot((this.PoX - ex), (this.PoY - ey));
                        let [unnormalX, unnormalY] = normal(normalX, normalY);  //bounces off other side
                        scalar = 2 * friction * dotP(this.Vx, this.Vy, unnormalX, unnormalY);
                        aa = normalX;
                        ab = -this.Vx;
                        if(ab == 0){    //prevent division by 0
                            ab = 0.01;
                        }
                        ba = normalY;
                        if(ba == 0){
                            ba = 0.01;
                        }                    
                        bb = -this.Vy;
                        t = this.PoX - ((dist1 < dist2 ? sx: ex) - this.radus * unnormalX * Math.sign(scalar));
                        r = this.PoY - ((dist1 < dist2 ? sy: ey) - this.radus * unnormalY * Math.sign(scalar));

                        aa /= ab;
                        t /= ab;
                        ba -= bb * aa;
                        r -= bb * t;
                        r /= ba;

                        this.PoX = (dist1 < dist2 ? sx: ex) - this.radus * unnormalX * Math.sign(scalar) + r * normalX; //move back onto initial path
                        this.PoY = (dist1 < dist2 ? sy: ey) - this.radus * unnormalY * Math.sign(scalar) + r * normalY;
                        unmovedDist = 0;
                        this.Vx -= scalar * unnormalX;    //translate vector correct way
                        this.Vy -= scalar * unnormalY;    
                        break;                    
                    }
    
                    this.PoX += r * this.Vx * unmovedDist;    //go to point of impact
                    this.PoY += r * this.Vy * unmovedDist;
                    unmovedDist -= Math.hypot(r * this.Vx * unmovedDist, r * this.Vy * unmovedDist) / this.HSpeed;    //fraction of moved distance
    
                    this.Vx -= scalar * normalX;    //translate vector correct way
                    this.Vy -= scalar * normalY;
                    nPoX += this.Vx * unmovedDist;
                    nPoY += this.Vy * unmovedDist; 
                }
            }
        }
        
        //-----Spaghetti Block Collision Take 3-----
        for(const path of brickData){ //+ 0.5 * this.radus so corners work
            let dx, dy = 0;
            if(nPoY > path.TLCornerY - this.radus && nPoY < path.TLCornerY + path.dy + this.radus){ //hit vertical side
                let rightSideVariable = 0;  //used as width if hit right side
                if(Math.sign(this.Vx) == 1){    //left or right side
                    dx = path.TLCornerX - (nPoX + this.radus);
                }
                else{
                    dx = nPoX - this.radus - (path.TLCornerX + path.dx);
                    rightSideVariable = path.dx;
                }
                if(dx < 0 && dx > -this.radus){
                    this.PoX = path.TLCornerX + rightSideVariable - this.radus * Math.sign(this.Vx);
                    this.Vx *= -1;
                }
            }
            if(nPoX > path.TLCornerX - this.radus && nPoX < path.TLCornerX + path.dx + this.radus){ //hit horizontal side
                let bottomSideVariable = 0; //used as height if bottom side is hit
                if(Math.sign(this.Vy) == 1){    //top or bottom side
                    dy = path.TLCornerY - (nPoY + this.radus);
                }
                else{
                    dy = nPoY - this.radus - (path.TLCornerY + path.dy) ;
                    bottomSideVariable = path.dy;
                }
                if(dy < 0 && dy > -this.radus){
                    this.PoY = path.TLCornerY + bottomSideVariable - this.radus * Math.sign(this.Vy);   //set position outiside of block
                    if(bottomSideVariable == 0 && Math.abs(this.Vy) < 1){    //stick if hit top side and speed is low enough
                        this.Vy = 0;
                    }
                    else{
                        this.Vy = this.Vy * -friction + gravity;
                    }
                }
            }
        }
        
        //-----Vertical Movement-----
        if(!ctx.isPointInPath(fieldCollission, this.PoX, nPoY + this.radus * Math.sign(this.Vy))){    //bounce of level boundaries
            if(Math.sign(this.Vy) == 1){
                this.PoY = fldHeight - this.radus;
            }
            else{
                this.PoY = this.radus;
            }
            this.Vy = this.Vy * -friction + gravity;
            if(Math.abs(this.Vy) < 2){   //stick to ground if speed is to low
                this.Vy = 0;
            }
        }
        
        //-----Horizontal Movement-----
        if(!ctx.isPointInPath(fieldCollission, nPoX + this.radus * Math.sign(this.Vx), this.PoY)){    //bounce of level boundaries
            if(Math.sign(this.Vx) == 1){
                this.PoX = fldWidth - this.radus;
            }
            else{
                this.PoX = this.radus;
            }
            this.Vx *= -1;
        }
        if(unmovedDist < 0){    //failsafe
            unmovedDist = 0;
        }
        this.PoX += unmovedDist * this.Vx;    //move ball
        this.PoY += unmovedDist * this.Vy;
        
        this.Vy += gravity;

        //-----Rotation uhhhhhhhhhhh-----
        this.rot += Math.PI / 180 * this.HSpeed * Math.sign(this.Vx);    //angle in degrees

        this.HSpeed = Math.hypot(this.Vx, this.Vy); //update HSpeed
        var circle = {shape: 1, PoX: this.PoX, PoY: this.PoY, Vx: this.Vx, Vy: this.Vy, rad: this.radus, rot: this.rot};
        ballsData[0] = circle;  //update info in ballsData
    }
    showPath(){
        ctx.lineWidth = 2;
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

class Peg{
    constructor(x, y, r){
        this.x = x;
        this.y = y;
        this.radius = 10;

        let peg = {shape: 4, x: this.x, y: this.y, r: 10};
        pegData.push(peg);
        draw(peg);
    }
}

function draw(data){
    //always have the ID of the shape in the input -> {shape: n, ...}
    //Shapes:
    //1 = Circle -> {PosX, PosY, rad}
    //2 = Rectangle -> {TLCornerX, TLCornerY, dx, dy, color}
    //3 = Line -> {Sx, Sy, Ex, Ey, color}

    switch(data.shape){
        case 1:{
            let {PoX: x, PoY: y, rad: r, rot: rot} = data; //destructuring object into variables
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI); //defines the circle

            ctx.translate(x, y);  //rotate around center
            ctx.rotate(rot);    
            ctx.translate(-x, -y);
            let grad = ctx.createRadialGradient(x - r/2, y - r/2, 1, x, y, r); 
            grad.addColorStop(0, "lightgreen");
            grad.addColorStop(1, "rgb(0, 185, 9)");
            ctx.fillStyle = grad;   //makes the gradient
            
            ctx.fill(); //actually draws the circle
            ctx.setTransform(1, 0, 0, 1, 0, 0); //resets transformations
            break;
        }

        case 2:{
            let {TLCornerX: x, TLCornerY: y, dx: width, dy: height, color: color} = data;
            let grad = ctx.createLinearGradient(x, y, x + width, y); 
            grad.addColorStop(0.1, "white");
            grad.addColorStop(1, `hsl(${color}, 87%, 50%)`); //random hue 
            ctx.fillStyle = grad;   //makes the gradient
            ctx.fillRect(x, y, width, height);

            ctx.strokeStyle = `hsl(${color}, 87%, 40%)`;
            ctx.lineWidth = Math.log1p(height); //adjust edge width
            ctx.lineJoin = "round"; //rounded corners
            ctx.strokeRect(x, y, width, height);
            break;
        }

        case 3:{
            let {Sx: Sx, Sy: Sy, Ex: Ex, Ey: Ey, color: colour} = data;
            ctx.lineWidth = 5;
            ctx.strokeStyle = colour;
            ctx.fillStyle = colour;
            ctx.beginPath();
            ctx.moveTo(Sx, Sy);
            ctx.lineTo(Ex, Ey);
            ctx.stroke();

            ctx.arc(Sx, Sy, 2.5, 0, 2 * Math.PI);   //rounded edges
            ctx.fill();
            ctx.arc(Ex, Ey, 2.5, 0, 2 * Math.PI);
            ctx.fill();
            break;
        }

        case 4:{
            let {x: x, y: y, r: r} = data;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
            let grad = ctx.createRadialGradient(x, y, 1, x, y, r);
            grad.addColorStop(0, "rgb(245, 90, 41)");
            grad.addColorStop(0.8, "rgb(245, 0, 0)");
            grad.addColorStop(0.9, "rgb(198, 0, 0)");
            ctx.fillStyle = grad;
            ctx.fill();
            break;
        }
    }
}