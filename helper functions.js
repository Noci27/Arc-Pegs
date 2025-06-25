//-----Vector helper functions-----
function dotP(Vx1, Vy1, Vx2, Vy2){  //dot product
    return Vx1 * Vx2 + Vy1 * Vy2;
}

function normal(Vx, Vy){    //returns an array containing the components of a normalized normal vector of the input
    let scalar = Math.hypot(Vx, Vy);
    if(scalar == 0){
        return [0, 0];
    }
    let normX = -Vy / scalar;
    let normY = Vx / scalar;
    return [normX, normY];
}