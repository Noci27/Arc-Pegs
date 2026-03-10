const container = document.getElementById("canvas-container");
const field = document.getElementById("gameplayLayer");     //gameplay layer
const ctx = field.getContext("2d"); //gives tools for drawing
const drawLayer = document.getElementById("drawLayer");   //for UI and stuff
const drawLayerCtx = drawLayer.getContext("2d");
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
        this.x = x;
        this.y = y;
        this.startX = x;    //initial position used for resseting
        this.startY = y;
        this.radus = radius;
        this.Vx = 0;
        this.Vy = 0;
        this.HSpeed = 0;
        this.rot = 0;
        this.id = Date.now();
        ballsData.push(this);
        draw(this);

        let dragObejct = document.createElement("div");
        dragObejct.style.width = `${2 * this.radus}px`;
        dragObejct.style.height = `${2 * this.radus}px`;
        dragObejct.style.left = `${this.x - (this.radus >= 25 ? this.radus: 25) - camera.x}px`;
        dragObejct.style.top = `${this.y - (this.radus >= 25 ? this.radus: 25) - camera.y}px`;
        dropbox.appendChild(dragObejct);
        dragObejct.className = "dragObject roundDragElement";
        dragObejct.id = this.id;
        dragObejct.addEventListener("mousedown", getMouseOffset);
        dragObjects.push(dragObejct);
    }
    update(){      
        let unmovedDist = 1;  //fraction of remaining movement
        let nPoY = this.y + this.Vy;  //next intended position
        let nPoX = this.x + this.Vx;
        let movebox = this.getData().MoveBox;   //bounding box of movement

        //-----Peg Collision-----
        for(let i = 0; i < pegData.length; i++){
            let peg = pegData[i];
            if(checkOverlapCircle([peg.x, peg.y, peg.radius], movebox) || peg.radius + this.radus > Math.hypot((peg.x - nPoX), (peg.y - nPoY))){
                let [unitX, unitY] = unit(this.Vx, this.Vy);
                let [normalX, normalY] = normal(this.Vx, this.Vy);
                let distToMovement = dotP(normalX, normalY, this.x - peg.x, this.y - peg.y);    //it's always the distance between the two center points projected onto the normal vector
                normalX *= distToMovement;  //scale normal vector to reach the movement line
                normalY *= distToMovement; 
                let distToCollision = Math.sqrt(Math.pow(this.radus + peg.radius, 2) - Math.pow(distToMovement, 2));
                let translationX = normalX - distToCollision * unitX;
                let translationY = normalY - distToCollision * unitY;
                let movedDist = Math.hypot((peg.x + translationX - this.x), (peg.y + translationY - this.y)) / this.HSpeed;
                this.x = peg.x + translationX;
                this.y = peg.y + translationY;

                let [mirrorX, mirrorY] = unit(peg.x - this.x, peg.y - this.y);  //mirror speed vector
                let scalar = 2 * friction * dotP(this.Vx, this.Vy, mirrorX, mirrorY);
                this.Vx -= scalar * mirrorX;
                this.Vy -= scalar * mirrorY;

                unmovedDist -= movedDist;
                nPoX = this.x + unmovedDist * this.Vx;
                nPoY = this.y + unmovedDist * this.Vy;
                movebox = this.getData().MoveBox;   //update movebox
                i = -1; //go through all pegs again
            }
        }

        //-----Slope Collision-----
        if(unmovedDist != 0){
            for(let i = 0; i < slopeData.length; i++){
                let slope = slopeData[i];
                if(checkOverlap(movebox, [[slope.Sx, slope.Sy], [slope.Ex, slope.Ey]])){
                    let [normalX, normalY] = normal((slope.Ex-slope.Sx), (slope.Ey-slope.Sy));
                    let scalar = 2 * friction * dotP(this.Vx, this.Vy, normalX, normalY);  //mirror moving vector + dampening
                    let result = areCrossing([[this.x + this.radus * Math.sign(scalar) * normalX, this.y + this.radus * Math.sign(scalar) * normalY], [nPoX +this.radus * Math.sign(scalar) * normalX, nPoY + this.radus * Math.sign(scalar) * normalY]], [[slope.Sx, slope.Sy], [slope.Ex, slope.Ey]]).line1;   //offset line by radius of ball
                    console.log(result)
                    if(result <= 1 && result >= 0){    //check if collision is valid (initial check wasn't corner of movebox)
                        this.x += result * this.Vx * unmovedDist;    //go to point of impact
                        this.y += result * this.Vy * unmovedDist;
                        unmovedDist -= Math.hypot(result * this.Vx * unmovedDist, result * this.Vy * unmovedDist) / this.HSpeed;    //fraction of moved distance
                        this.Vx -= scalar * normalX;    //translate vector correct way
                        this.Vy -= scalar * normalY;
                        nPoX = this.x + unmovedDist * this.Vx;  //update next intended location
                        nPoY = this.y + unmovedDist * this.Vy;
                        this.HSpeed = Math.hypot(this.Vx, this.Vy); //update HSpeed (needed for next line)
                        movebox = this.getData().MoveBox;   //update movebox
                        i = -1;  //recalcualte all slopes again
                    }
                }
            }
        }
        
        //-----Spaghetti Block Collision Take 4-----
        for(const path of brickData){
            let brick = [[path.x, path.y],[path.x + path.width, path.y],[path.x + path.width, path.y + path.height],[path.x, path.y + path.height]];
            if(checkOverlap(brick, movebox) || checkOverlapCircle([nPoX, nPoY, this.radus], brick)){
                let marginBox = [[path.x - this.radus, path.y - this.radus], [path.x + path.width + this.radus, path.y - this.radus], [path.x + path.width + this.radus, path.y + path.height + this.radus], [path.x - this.radus, path.y + path.height + this.radus]];
                let minDist = Number.MAX_SAFE_INTEGER;
                let minDistID = 4;
                for(let i = 0; i < 4; i++){ //find side of impact
                    let dist = areCrossing([[this.x, this.y],[nPoX, nPoY]],[marginBox[i], marginBox[(i+1)%4]]).line1;
                    if(dist >= 0 && dist < minDist){
                        minDist = dist;
                        minDistID = i;
                    } 
                }
                this.x += minDist * this.Vx;  //move to point of impact
                this.y += minDist * this.Vy;
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
        
        this.x += unmovedDist * this.Vx;    //move ball
        this.y += unmovedDist * this.Vy;
        
        //-----Camera-----
        if(!contains({x: this.x, y: this.y}, [[camera.cameraMoveBox.x, camera.cameraMoveBox.y], [camera.cameraMoveBox.x + camera.cameraMoveBox.dx, camera.cameraMoveBox.y], [camera.cameraMoveBox.x + camera.cameraMoveBox.dx, camera.cameraMoveBox.y + camera.cameraMoveBox.dy], [camera.cameraMoveBox.x, camera.cameraMoveBox.y + camera.cameraMoveBox.dy]])){
            let distX = camera.cameraMoveBox.x - this.x;
            let distY = camera.cameraMoveBox.y - this.y;
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
    }
    reset(){    //reset to initial state
        this.x = this.startX;
        this.y = this.startY;
        this.Vx = 0;
        this.Vy = 0;
        this.rot = 0;
    }
    showPath(){
        ctx.lineWidth = 2;  //line
        ctx.strokeStyle = "red";
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.Vx, this.y + this.Vy);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.x + this.Vx, this.y + this.Vy, this.radus, 0 , 2 * Math.PI);
        ctx.stroke();

        ctx.strokeStyle = "orange";
        let cornerX = this.x - this.radus;
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.acos(this.Vy / this.HSpeed) * (this.Vx < 0 ? 1:-1));
        ctx.translate(-this.x, -this.y);
        ctx.strokeRect(cornerX, this.y, 2 * this.radus * ((cornerX > this.x) ? -1:1), this.HSpeed);
        ctx.setTransform(1, 0, 0, 1, -camera.x, -camera.y);
    }
    getData(){
        let [movingNormalX, movingNormalY] = normal(this.Vx, this.Vy);  //normal to speed vector
        let moveBox = new Array;
        for(let i = 0; i < 2; i++){
            for(let j = -1; j < 2; j += 2){
                let cornerX = this.x + i * (this.HSpeed * movingNormalY) + j * (this.radus * movingNormalX);
                let cornerY = this.y + i * (this.HSpeed * movingNormalX * -1) + j * (this.radus * movingNormalY);
                moveBox.push([cornerX, cornerY]);
            }
            if(i == 0){ //switch two of the corners so the array's sorted correctly
                moveBox.reverse();
            }
        }   
        let element = {X: this.x, Y: this.y, Radius: this.radus, StartX: this.startX, StartY: this.startY, VSpeed: this.Vy, XSpeed:this.Vx, HSpeed: this.HSpeed, MoveBox: moveBox};
        return element;
    }
}

class Brick{
    constructor(x, y, width, height){
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.id = Date.now();
        this.color = Math.floor(Math.random() * 360);
        this.colorBrightness = 50;  //change this during a hover
        if(this.width != 0 && this.height != 0){    //ignore if either height or width is 0
            brickData.push(this);
            draw(this);
    
            let dragObejct = document.createElement("div");
            let intendedWidth = (this.width < 50 ? 50: this.width);
            dragObejct.style.width = `${intendedWidth}px`;
            let intendedHeight = (this.height < 50 ? 50: this.height);
            dragObejct.style.height = `${intendedHeight}px`;
            dragObejct.style.left = `${this.x - (intendedWidth - this.width)/2 - camera.x}px`;
            dragObejct.style.top = `${this.y - (intendedHeight - this.height)/2 - camera.y}px`;
            dropbox.appendChild(dragObejct);
            dragObejct.className = "dragObject";
            dragObejct.id = this.id;
            dragObejct.addEventListener("mousedown", getMouseOffset);
            dragObejct.addEventListener("mouseover", dim);
            dragObejct.addEventListener("mouseleave", unDim);
            dragObjects.push(dragObejct);
        }
    }
}

class Slope{
    constructor(Sx, Sy, Ex, Ey){
        this.Sx = Sx;
        this.Sy = Sy;
        this.Ex = Ex;
        this.Ey = Ey;
        this.color = "black";
        this.id = Date.now();
        if(!(this.Ex - this.Sx == 0 && this.Ey - this.Sy == 0)){   //ignore if slope's length is 0
            slopeData.push(this);
            draw(this);

            let [normalX, normalY] = normal((this.Ex - this.Sx), (this.Ey - this.Sy));
            normalX *= 25;  //scale vector to half of min-height
            normalY *= 25;
            let dragObejct = document.createElement("div");
            dragObejct.style.width = `${Math.hypot((this.Ex - this.Sx), (this.Ey - this.Sy))}px`;
            dragObejct.style.left = `${this.Sx - normalX - camera.x}px`;
            dragObejct.style.top = `${this.Sy - normalY - camera.y}px`;
            dragObejct.style.rotate = `${Math.atan((this.Ey - this.Sy) / (this.Ex - this.Sx))}rad`
            dropbox.appendChild(dragObejct);
            dragObejct.className = "dragObject";
            dragObejct.id = this.id;
            dragObejct.addEventListener("mousedown", getMouseOffset);
            dragObjects.push(dragObejct);
        }
    }
}

class Peg{
    constructor(x, y, r, id){
        this.x = x;
        this.y = y;
        this.radius = typeof(r) === "number"? r : 10;
        this.id = typeof(id) === "number" ? id : Date.now();
        this.color = 14;        //hsl value

        pegData.push(this);
        draw(this);

        let dragObejct = document.createElement("div");
        dragObejct.style.width = `${2 * this.radius}px`;
        dragObejct.style.height = `${2 * this.radius}px`;
        dragObejct.style.left = `${this.x - (this.radius >= 25 ? this.radius: 25) - camera.x}px`;
        dragObejct.style.top = `${this.y - (this.radius >= 25 ? this.radius: 25) - camera.y}px`;
        dropbox.appendChild(dragObejct);
        dragObejct.className = "dragObject roundDragElement";
        dragObejct.id = this.id;
        dragObejct.addEventListener("mousedown", getMouseOffset);
        dragObjects.push(dragObejct);
    }
}

function draw(element){
    switch(element.constructor.name){
        case "Ball":{
            let {x: x, y: y, radus: r, rot: rot} = element; //destructuring object into variables
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

        case "Brick":{
            let {x: x, y: y, width: width, height: height, color: color, colorBrightness: brightness} = element;
            let grad = ctx.createLinearGradient(x, y, x + width, y); 
            grad.addColorStop(0.1, "white");
            grad.addColorStop(1, `hsl(${color}, 87%, ${brightness}%)`); //random hue 
            ctx.fillStyle = grad;   //makes the gradient
            ctx.fillRect(x, y, width, height);

            ctx.strokeStyle = `hsl(${color}, 87%, ${brightness - 10}%)`;
            ctx.lineWidth = Math.log1p(height); //adjust edge width
            ctx.lineJoin = "round"; //rounded corners
            ctx.strokeRect(x, y, width, height);
            break;
        }

        case "Slope":{
            let {Sx: Sx, Sy: Sy, Ex: Ex, Ey: Ey, color: color} = element;
            ctx.lineWidth = 5;
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
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

        case "Peg":{
            let {x: x, y: y, radius: r} = element;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
            let grad = ctx.createRadialGradient(x, y, 1, x, y, r);
            grad.addColorStop(0, "hsl(14, 91%, 56%)");
            grad.addColorStop(0.8, "hsl(14, 100%, 48%)");
            grad.addColorStop(0.9, "hsl(14, 100%, 39%)");
            ctx.fillStyle = grad;
            ctx.fill();
            break;
        }
    }
}