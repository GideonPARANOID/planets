////////////////////////////////////////////////////////////////////////////////////////////////////
// initialisation


var gl, shaderProgram, items, mvMatrix = mat4.create(), pMatrix = mat4.create(), pMovement = { x : .5, y : .5 }; 

var s;

window.onload = function initialise() {
   can = document.getElementById('can');

   // mouse movement & perspective shifting
   can.onmousemove = function(eve) {
      var rect = eve.target.getBoundingClientRect(),
          can = eve.srcElement;

      pMovement = {
         x : (eve.clientX - rect.left) / can.width,
         y : (eve.clientY - rect.top) / can.height
      };
   }


   initialiseGL(can);
   initialiseShaders();




   var latitudeBands = 20;
   var longitudeBands = 20
   var radius = 1;



  var vertexPositionData = [];
    var normalData = [];
    var textureCoordData = [];
    for (var latNumber = 0; latNumber <= latitudeBands; latNumber++) {
      var theta = latNumber * Math.PI / latitudeBands;
      var sinTheta = Math.sin(theta);
      var cosTheta = Math.cos(theta);

      for (var longNumber = 0; longNumber <= longitudeBands; longNumber++) {
        var phi = longNumber * 2 * Math.PI / longitudeBands;
        var sinPhi = Math.sin(phi);
        var cosPhi = Math.cos(phi);

        var x = cosPhi * sinTheta;
        var y = cosTheta;
        var z = sinPhi * sinTheta;
        var u = 1 - (longNumber / longitudeBands);
        var v = 1 - (latNumber / latitudeBands);

        normalData.push(x);
        normalData.push(y);
        normalData.push(z);
        textureCoordData.push(u);
        textureCoordData.push(v);
        vertexPositionData.push(radius * x);
        vertexPositionData.push(radius * y);
        vertexPositionData.push(radius * z);
      }
    }


var indexData = [];
    for (var latNumber = 0; latNumber < latitudeBands; latNumber++) {
      for (var longNumber = 0; longNumber < longitudeBands; longNumber++) {
        var first = (latNumber * (longitudeBands + 1)) + longNumber;
        var second = first + longitudeBands + 1;
        indexData.push(first);
        indexData.push(second);
        indexData.push(first + 1);

        indexData.push(second);
        indexData.push(second + 1);
        indexData.push(first + 1);
      }
    }

   console.log(vertexPositionData.length);
//   console.log(normalData.length);
//   console.log(indexData);






   var tem = [1, 1, 1, 1];

   col = [];

   for (var i = 0; i < 441; i++) {
      col = col.concat(tem);
   }
   

   s = new Cube(vertexPositionData, 3, indexData, col, 4);






   // building color array
   
   colors = [ // front back top bottom right left
      [1,  0,  0,  1],
      [1,  1,  0,  1],
      [0,  1,  0,  1],
      [1, .5, .5,  1],
      [1,  0,  1,  1],
      [0,  0,  1,  1],
    ];
   
   var unpackedColors = [];
   for (var i in colors) {
   var color = colors[i];
      for (var j = 0; j < 4; j++) {
         unpackedColors = unpackedColors.concat(color);
      }
   } 
   
   items = initialiseItems([new Item([
       0,  1,  0,
      -1, -1,  0,
       1, -1,  0
   ], 3, [
       1,  0,  0,  1,
       0,  1,  0,  1,
       0,  0,  1,  1
   ], 4), new Item([
       1,  1,  0,
      -1,  1,  0,
       1, -1,  0,
      -1, -1,  0
   ], 3, [
       1,  0,  0,  1,
       0,  1,  0,  1,
       1,  0,  1,  1,
       1,  0,  1,  1
   ], 4), new Cube([ // front back top  bottom right left
      -1, -1,  1,
       1, -1,  1,
       1,  1,  1,
      -1,  1,  1,

      -1, -1, -1,
      -1,  1, -1,
       1,  1, -1,
       1, -1, -1,

      -1,  1, -1,
      -1,  1,  1,
       1,  1,  1,
       1,  1, -1,

      -1, -1, -1,
       1, -1, -1,
       1, -1,  1,
      -1, -1,  1,
       
       1, -1, -1,
       1,  1, -1,
       1,  1,  1,
       1, -1,  1,

      -1, -1, -1,
      -1, -1,  1,
      -1,  1,  1,
      -1,  1, -1
      ], 3, [ // front back top bottom right left
       0,  1,  2,  0,  2,  3, 
       4,  5,  6,  4,  6,  7, 
       8,  9, 10,  8, 10, 11, 
      12, 13, 14, 12, 14, 15,
      16, 17, 18, 16, 18, 19, 
      20, 21, 22, 20, 22, 23  
      ], unpackedColors, 4), s]);
 
   gl.clearColor(0, 0, 0, 1);
   gl.enable(gl.DEPTH_TEST);

   animate.timeLast = 0;
   tick();
}


/**
 * @param   can            canvas dom object
 */
function initialiseGL(can) {
   try {
      gl = can.getContext('experimental-webgl');
      var dim = getViewportDimensions();

      can.width = dim.w;
      can.height = dim.h;
      gl.width = dim.w;
      gl.height = dim.h;

   } catch (exeception) {
      console.error('could not initialise webgl');
   } 
}



/**
 *
 */
function initialiseShaders() {
   var fragmentShader = getShader(gl, 'shader-fs'),
       vertexShader = getShader(gl, 'shader-vs');
   
   shaderProgram = gl.createProgram();

   gl.attachShader(shaderProgram, vertexShader);
   gl.attachShader(shaderProgram, fragmentShader);
   gl.linkProgram(shaderProgram);

   if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.error('could not initialise shaders');
   }

   gl.useProgram(shaderProgram);

   // shader for interpolating across positions
   shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
   gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

   // shader for interpolating across colours
   shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, 'aVertexColor');
   gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

   shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, 'uPMatrix');
   shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, 'uMVMatrix');
}




function initialiseItems(items) {
   return items;
}



////////////////////////////////////////////////////////////////////////////////////////////////////
// animation


/**
 * keeps in sync with browser animation frames
 */
function tick() {
//requestAnimationFrame(tick);

   drawScene();
   animate();
}



/**
 * performs animation, time synchronised (not frame synchronised)
 */
function animate() {
   var timeNow = new Date().getTime();

   if (animate.timeLast) {
      var elapsed = timeNow - animate.timeLast;
   
      // stuff to do every tick here

      for (var i = 0; i < items.length; i++) {
         items[i].animate();
      }
   }
   animate.timeLast = timeNow;
}


/**
 *
 */
function drawScene() {
   gl.viewport(0, 0, gl.width, gl.height);
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

   mat4.perspective(pMatrix, 90, gl.width / gl.height, 0.1, 100);
 
   // moving the perspective based on cursor location
   mat4.translate(pMatrix, pMatrix, [0, 0, -7])
   mat4.rotate(pMatrix, pMatrix, -.5 + pMovement.x, [0, 1, 0]);
   mat4.rotate(pMatrix, pMatrix, -.5 + pMovement.y, [1, 0, 0]);
   mat4.translate(pMatrix, pMatrix, [0, 0, 7])

   // basic order of things is - move the origin via a series of matrices, draw, then reset origin

   // triangle
   items[0].pushMatrix([
         mat4.translate(mvMatrix, mvMatrix,[-1.5, 0, -7]),
         mat4.translate(mvMatrix, mvMatrix,[-3, 0, 2])]);
   
   items[0].draw();
   mvMatrix = mat4.create();

   // plane
   items[1].pushMatrix([
         mat4.translate(mvMatrix, mvMatrix, [0, 0, -7]),
         mat4.rotate(mvMatrix, mvMatrix, 1, [1, 0, 0])]);
   items[1].draw();
   mvMatrix = mat4.create();

   // cube
   items[2].pushMatrix([
         mat4.translate(mvMatrix, mvMatrix, [1, 0, -5]),
         mat4.rotate(mvMatrix, mvMatrix, 1, [1, 1, 0])]);

   items[2].draw();
   mvMatrix = mat4.create();

   // spehere
   items[3].pushMatrix([
         mat4.translate(mvMatrix, mvMatrix, [1, 0, -2])]);

   items[3].draw();
   mvMatrix = mat4.create();
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// items class


/**
 * @param   vertices       array of vertex descriptions
 * @param   vertexLength   length of vertex description
 * @param   colors         array of color descriptions
 * @param   colorLength    length of color description
 */
function Item(vertices, vertexLength, colors, colorLength, animation) {
   this.vertices = new Float32Array(vertices);
   this.vertexCount = vertices.length / vertexLength;
   this.vertexLength = vertexLength;

   this.colors = new Float32Array(colors);
   this.colorCount = colors.length / colorLength;
   this.colorLength = colorLength;

   this.animation = animation;
   this.matrix = mat4.create();
}


/**
 * @param   matrix         array of mat4 matrices to push onto item's marix stack
 */ 
Item.prototype.pushMatrix = function(matrixList) {  
   for (var i = 0 ; i < matrixList.length; i++) {
      var currentMatrix = mat4.create(), 
          newMatrix = mat4.create();

      mat4.copy(currentMatrix, this.matrix);
      mat4.copy(newMatrix, matrixList[i]);
      
      mat4.multiply(this.matrix, currentMatrix, newMatrix);
   }
}


/**
 * @return                 webgl buffer (vertex)
 */
Item.prototype.bufferVertices = function() {
   var buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
   buffer.vertexCount = this.vertexCount;
   buffer.vertexLength = this.vertexLength;

   return buffer;
}


/**
 * @return                 webgl buffer (color)
 */
Item.prototype.bufferColors = function() {
   var buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, this.colors, gl.STATIC_DRAW);
   buffer.colorCount = this.colorCount;
   buffer.colorLength = this.colorLength;

   return buffer;
}


/**
 * draws the item
 */
Item.prototype.draw = function() {
   mat4.identity(this.matrix);   

   var bufferVertices = this.bufferVertices(gl);

   gl.bindBuffer(gl.ARRAY_BUFFER, bufferVertices);
   gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, bufferVertices.vertexLength, gl.FLOAT, false, 0, 0);

   var bufferColors = this.bufferColors(gl);
   gl.bindBuffer(gl.ARRAY_BUFFER, bufferColors);
   gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, bufferColors.colorLength, gl.FLOAT, false, 0, 0);

   setMatrixUniforms(gl, shaderProgram);
   gl.drawArrays(gl.TRIANGLE_STRIP, 0, bufferVertices.vertexCount);
}



Item.prototype.animate = function() {
//   this.animation();
}


////////////////////////////////////////////////////////////////////////////////////////////////////
// cube class


function Cube(vertices, vertexLength, vertexIndices, colors, colorLength, animation) {
   Item.call(this, vertices, vertexLength, colors, colorLength, animation);

   this.vertexIndices = new Uint16Array(vertexIndices);   
}


Cube.prototype = Object.create(Item.prototype);
Cube.prototype.constructor = Cube;

/**
 * @return                 webgl buffer (element)
 */
Cube.prototype.bufferVertexIndices = function() {
   var buffer = gl.createBuffer();
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndices, gl.STATIC_DRAW);

   return buffer;
}


/**
 * draws the cube
 */
Cube.prototype.draw = function() {
   mat4.identity(this.matrix);   

   var bufferVertices = this.bufferVertices(gl);

   gl.bindBuffer(gl.ARRAY_BUFFER, bufferVertices);
   gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, bufferVertices.vertexLength, gl.FLOAT, false, 0, 0);

   var bufferColors = this.bufferColors(gl);
   gl.bindBuffer(gl.ARRAY_BUFFER, bufferColors);
   gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, bufferColors.colorLength, gl.FLOAT, false, 0, 0);

   var bufferVertexIndices = this.bufferVertexIndices();
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferVertexIndices);

   setMatrixUniforms();
   gl.drawElements(gl.TRIANGLES, this.vertexIndices.length, gl.UNSIGNED_SHORT, 0);
}



////////////////////////////////////////////////////////////////////////////////////////////////////
// sphere










































////////////////////////////////////////////////////////////////////////////////////////////////////
// tools


function setMatrixUniforms() {
   gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
   gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}



