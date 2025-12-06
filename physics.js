const field = document.getElementById("field");     //gameplay layer
const ctx = field.getContext("2d"); //gives tools for drawing
const interactiveLayer = document.getElementById("interactiveLayer");   //for UI and stuff
const interactiveLayerCtx = interactiveLayer.getContext("2d");
var fldWidth = field.width; //need to be var for varied screen sizes
var fldHeight = field.height;
const gravity = 1.5;
const friction = 0.8;
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
        let movebox = this.getData().MoveBox;   //bounding box of movement

        //-----Peg Collision-----
        for(let peg of pegData){
            if(checkOverlapCircle([peg.x, peg.y, peg.r], movebox)){
                let [unitX, unitY] = unit(this.Vx, this.Vy);
                let [normalX, normalY] = normal(this.Vx, this.Vy);
                let distToMovement = dotP(normalX, normalY, this.PoX - peg.x, this.PoY - peg.y);    //it's always the distance between the two center points projected onto the normal vector
                normalX *= distToMovement;  //scale normal vector to reach the movement line
                normalY *= distToMovement; 
                let distToCollision = Math.sqrt(Math.pow(this.radus + peg.r, 2) - Math.pow(distToMovement, 2));
                let translationX = normalX - distToCollision * unitX;
                let translationY = normalY - distToCollision * unitY;
                this.PoX = peg.x + translationX;
                this.PoY = peg.y + translationY;

                let [mirrorX, mirrorY] = unit(peg.x - this.PoX, peg.y - this.PoY);  //mirror speed vector
                let scalar = 2 * friction * dotP(this.Vx, this.Vy, mirrorX, mirrorY);
                this.Vx -= scalar * mirrorX;
                this.Vy -= scalar * mirrorY;
                unmovedDist = 0;
                nPoX = this.PoX;
                nPoY = this.PoY;
                break;  //so only one collision happens per tick
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
        
        //-----Spaghetti Block Collision Take 4-----
        for(const path of brickData){
            let brick = [[path.x, path.y],[path.x + path.dx, path.y],[path.x + path.dx, path.y + path.dy],[path.x, path.y + path.dy]];
            if(checkOverlap(brick, movebox)){
                let marginBox = [[path.x - this.radus, path.y - this.radus], [path.x + path.dx + this.radus, path.y - this.radus], [path.x + path.dx + this.radus, path.y + path.dy + this.radus], [path.x - this.radus, path.y + path.dy + this.radus]];
                let minDist = Number.MAX_SAFE_INTEGER;
                let minDistID = 4;
                for(let i = 0; i < 4; i++){ //find side of impact
                    let dist = areCrossing([[this.PoX, this.PoY],[this.PoX+this.Vx, this.PoY+this.Vy]],[marginBox[i], marginBox[(i+1)%4]]).line1;
                    if(dist >= 0 && dist < minDist){
                        minDist = dist;
                        minDistID = i;
                    } 
                }
                this.PoX += minDist * this.Vx;  //move to point of impact
                this.PoY += minDist * this.Vy;
                console.log(this.Vy)
                if(Math.abs(this.Vy) < 2 * gravity){  //stick to floor if speed too low
                    this.Vy = 0;
                }
                else{
                    let [normalX, normalY] = normal(marginBox[(minDistID + 1)%4][0] - marginBox[minDistID][0], marginBox[(minDistID + 1)%4][1] - marginBox[minDistID][1]);
                    let scalar = 2 * friction * dotP(this.Vx, this.Vy, normalX, normalY);  //mirror moving vector + dampening
                    this.Vx -= scalar * normalX;    //translate vector correct way
                    this.Vy -= scalar * normalY;
                }
                unmovedDist -= minDist;
            }
        }
        
        this.PoX += unmovedDist * this.Vx;    //move ball
        this.PoY += unmovedDist * this.Vy;
        
        //-----Camera-----
        if(!contains({x: this.PoX, y: this.PoY}, [[camera.cameraMoveBox.x, camera.cameraMoveBox.y], [camera.cameraMoveBox.x + camera.cameraMoveBox.dx, camera.cameraMoveBox.y], [camera.cameraMoveBox.x + camera.cameraMoveBox.dx, camera.cameraMoveBox.y + camera.cameraMoveBox.dy], [camera.cameraMoveBox.x, camera.cameraMoveBox.y + camera.cameraMoveBox.dy]])){
            let distX = camera.cameraMoveBox.x - this.PoX;
            let distY = camera.cameraMoveBox.y - this.PoY;
            if(distX < 0){  //check in which octant ball is
                if(-distX < camera.cameraMoveBox.dx){
                    distX = 0;
                }
                else{
                    distX += camera.cameraMoveBox.dx;
                }
            }
            if(distY < 0){
                if(-distY < camera.cameraMoveBox.dy){
                    distY = 0;
                }
                else{
                    distY += camera.cameraMoveBox.dy;
                }
            }
            camera.move(-distX, -distY);
        }

        this.Vy += gravity;

        //-----Rotation uhhhhhhhhhhh-----
        this.rot += Math.PI / 180 * this.HSpeed * Math.sign(this.Vx);    //angle in degrees

        this.HSpeed = Math.hypot(this.Vx, this.Vy); //update HSpeed
        var circle = {shape: 1, PoX: this.PoX, PoY: this.PoY, Vx: this.Vx, Vy: this.Vy, rad: this.radus, rot: this.rot};
        ballsData[0] = circle;  //update info in ballsData
    }
    showPath(){
        ctx.lineWidth = 2;  //line
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
        ctx.strokeRect(cornerX, this.PoY, 2 * this.radus * ((cornerX > this.PoX) ? -1:1), this.HSpeed + this.radus);
        ctx.setTransform(1, 0, 0, 1, -camera.x, -camera.y);
    }
    getData(){
        let [movingNormalX, movingNormalY] = normal(this.Vx, this.Vy);  //normal to speed vector
        let moveBox = new Array;
        for(let i = 0; i < 2; i++){
            for(let j = -1; j < 2; j += 2){
                let cornerX = this.PoX + i * ((this.HSpeed + this.radus) * movingNormalY) + j * (this.radus * movingNormalX);
                let cornerY = this.PoY + i * ((this.HSpeed + this.radus) * movingNormalX * -1) + j * (this.radus * movingNormalY);
                moveBox.push([cornerX, cornerY]);
            }
            if(i == 0){ //switch two of the corners so the array's sorted correctly
                moveBox.reverse();
            }
        }   
        let data = {X: this.PoX, Y: this.PoY, VSpeed: this.Vy, XSpeed:this.Vx, HSpeed: this.HSpeed, MoveBox: moveBox};
        return data;
    }
}

class Brick{
    constructor(x, y, width, height){
        this.Cx = x;
        this.Cy = y;
        this.width = width;
        this.height = height;
        var rectangle = {shape: 2, x: this.Cx, y: this.Cy, dx: this.width, dy: this.height, color: Math.floor(Math.random() * 360)};
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
    //2 = Rectangle -> {x, y, dx, dy, color}
    //3 = Line -> {Sx, Sy, Ex, Ey, color}
    //4 = Peg -> {x, y, r}

    switch(data.shape){
        case 1:{
            let {PoX: x, PoY: y, rad: r, rot: rot} = data; //destructuring object into variables
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI); //defines the circle

            ctx.translate(x, y);  //rotate around center
            ctx.rotate(rot);
            let grad = ctx.createRadialGradient(r/2, -r/2, 1, 0, 0, r); 
            grad.addColorStop(0, "lightgreen");
            grad.addColorStop(1, "rgb(0, 185, 9)");
            ctx.fillStyle = grad;   //makes the gradient
            
            ctx.fill(); //actually draws the circle
            ctx.setTransform(1, 0, 0, 1, -camera.x, -camera.y); //reset transformations
            break;
        }

        case 2:{
            let {x: x, y: y, dx: width, dy: height, color: color} = data;
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