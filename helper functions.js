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

//-----Miscellaneous helper functions-----

//returns true if the given shapes overlap (Using SAT; NO circles, use next function for that), S1 and S2 are SORTED(!) arrays of vertices
function checkOverlap(S1, S2){
    if(S1.length < 2 || !S1 || S2.length < 2|| !S2){   //return if empty or only 1 vertex
        return false;
    }
    let numOfEdges = S1.length;
    for(let i = 0; i < numOfEdges; i++){
        let s1Min = Number.MAX_SAFE_INTEGER;
        let s1Max = Number.MIN_SAFE_INTEGER;
        let s2Min = Number.MAX_SAFE_INTEGER;
        let s2Max = Number.MIN_SAFE_INTEGER;
        let axisCheckX, axisCheckY = 0;
        if(numOfEdges == 2 && i == 1){  //handle slopes seperately
            [axisCheckX, axisCheckY] = [S1[1][0] - S1[0][0], S1[1][1] - S1[0][1]];
        }
        else{
            [axisCheckX, axisCheckY] = normal(S1[(i + 1) % numOfEdges][0] - S1[i][0], S1[(i + 1) % numOfEdges][1] - S1[i][1]);
        }
        for(let vertex of S1){
            let projection = dotP(axisCheckX, axisCheckY, vertex[0], vertex[1]);
            if(projection < s1Min){
                s1Min = projection;
            }
            if(projection > s1Max){
                s1Max = projection;
            }
        }
        for(let vertex of S2){
            let projection = dotP(axisCheckX, axisCheckY, vertex[0], vertex[1]);
            if(projection < s2Min){
                s2Min = projection;
            }
            if(projection > s2Max){
                s2Max = projection;
            }
        }
        if(!((s1Min > s2Min && s1Min < s2Max) || (s2Min > s1Min && s2Min < s1Max))){
            return false;
        }
    }

    //god I wish I could find a way to merge these 2 for loops into one but no matter what I don't see a way it woudl ever work :(
    numOfEdges = S2.length;
    for(let i = 0; i < numOfEdges; i++){
        let s1Min = Number.MAX_SAFE_INTEGER;
        let s1Max = Number.MIN_SAFE_INTEGER;
        let s2Min = Number.MAX_SAFE_INTEGER;
        let s2Max = Number.MIN_SAFE_INTEGER; 
        let axisCheckX, axisCheckY = 0;
        if(numOfEdges == 2 && i == 1){
            [axisCheckX, axisCheckY] = [S2[1][0] - S2[0][0], S2[1][1] - S2[0][1]];
        }
        else{
            [axisCheckX, axisCheckY] = normal(S2[(i + 1) % numOfEdges][0] - S2[i][0], S2[(i + 1) % numOfEdges][1] - S2[i][1]);
        }
        for(let vertex of S1){
            let projection = dotP(axisCheckX, axisCheckY, vertex[0], vertex[1]);
            if(projection < s1Min){
                s1Min = projection;
            }
            if(projection > s1Max){
                s1Max = projection;
            }
        }
        for(let vertex of S2){
            let projection = dotP(axisCheckX, axisCheckY, vertex[0], vertex[1]);
            if(projection < s2Min){
                s2Min = projection;
            }
            if(projection > s2Max){
                s2Max = projection;
            }
        }
        if(!((s1Min > s2Min && s1Min < s2Max) || (s2Min > s1Min && s2Min < s1Max))){
            return false;
        }
    }
    return true;
}

//same as previous function, but for circles as first shape
//use following syntax: C = [x, y, radius]
function checkOverlapCircle(C, NC){
    if(!C || !NC || C.length == 0 || NC.length < 2){
        return false;
    }
    let axisCheckX, axisCheckY;
    let closestCorner = Number.MAX_SAFE_INTEGER;
    let closestCornerIndex = 0;
    let numberOfEdges = NC.length;
    for(let i = 0; i < numberOfEdges; i++){
        let ncMin = Number.MAX_SAFE_INTEGER;
        let ncMax = Number.MIN_SAFE_INTEGER;
        if(numberOfEdges == 2 && i == 1){
            [axisCheckX, axisCheckY] = [NC[1][0] - NC[0][0], NC[1][1] - NC[0][1]];
            axisCheckX /= Math.hypot(axisCheckX, axisCheckY);   //make sure it's normalized
            axisCheckY /= Math.hypot(axisCheckX, axisCheckY);
        }
        else{
            [axisCheckX, axisCheckY] = normal(NC[(i + 1) % numberOfEdges][0] - NC[i][0], NC[(i + 1) % numberOfEdges][1] - NC[i][1]);
        }
        for(let vertex of NC){
            let projection = dotP(axisCheckX, axisCheckY, vertex[0], vertex[1]);
            if(projection < ncMin){
                ncMin = projection;
            }
            if(projection > ncMax){
                ncMax = projection;
            }
        }
        let cMin = dotP(axisCheckX, axisCheckY, C[0], C[1]) - C[2];
        let cMax = dotP(axisCheckX, axisCheckY, C[0], C[1]) + C[2];
        if(!((cMin > ncMin && cMin < ncMax) || (ncMin > cMin && ncMin < cMax))){
            return false;
        }
        let distance = Math.hypot(NC[i][0] - C[0], NC[i][1] - C[1]);
        if(distance < closestCorner){
            closestCorner = distance;
            closestCornerIndex = i;
        }
    }
    //only need to check closest corner
    axisCheckX = C[0] - NC[closestCornerIndex][0];
    axisCheckY = C[1] - NC[closestCornerIndex][1];
    axisCheckX /= Math.hypot(axisCheckX, axisCheckY);
    axisCheckY /= Math.hypot(axisCheckX, axisCheckY);
    let ncMin = Number.MAX_SAFE_INTEGER;
    let ncMax = Number.MIN_SAFE_INTEGER;
    for(let vertex of NC){
        let projection = dotP(axisCheckX, axisCheckY, vertex[0], vertex[1]);
        if(projection < ncMin){
            ncMin = projection;
        }
        if(projection > ncMax){
            ncMax = projection;
        }
    }
    let cMin = dotP(axisCheckX, axisCheckY, C[0], C[1]) - C[2];
    let cMax = dotP(axisCheckX, axisCheckY, C[0], C[1]) + C[2];
    if(!((cMin > ncMin && cMin < ncMax) || (ncMin > cMin && ncMin < cMax))){
        return false;
    }
    return true;
}