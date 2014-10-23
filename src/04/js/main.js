////////////////////////////////////////////////////////////////////////////////////////////////////
// initialisation


var gl, shaderProgram, items, mvMatrix = mat4.create(), pMatrix = mat4.create(), pMovement = { x : .5, y : .5 }; 


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


   var tem = [1, 1, 1, 1];

   col = [];

   for (var i = 0; i < 441; i++) {
      col = col.concat(tem);
   }
   

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
   ], [
       1,  0,  0,  1,
       0,  1,  0,  1,
       0,  0,  1,  1
   ]), new Item([
       1,  1,  0,
      -1,  1,  0,
       1, -1,  0,
      -1, -1,  0
   ], [
       1,  0,  0,  1,
       0,  1,  0,  1,
       1,  0,  1,  1,
       1,  0,  1,  1
   ]), new Cube(1, unpackedColors), 
       new Sphere(1, 20, col)]);
 
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
   requestAnimationFrame(tick);

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
         mat4.translate(mvMatrix, mvMatrix, [2, 0, -2])]);

   items[3].draw();
   mvMatrix = mat4.create();
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// items class


/**
 * @param   vertices       array of vertex descriptions
 * @param   colors         array of color descriptions
 */
function Item(vertices, colors, animation) {
   this.vertices = new Float32Array(vertices);
   this.vertexCount = vertices.length / 3;

   this.colors = new Float32Array(colors);
   this.colorCount = colors.length / 4;

   this.animation = animation;
   this.matrix = mat4.create();

   
   this.bufferVertices = function() {
      var buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
      buffer.vertexCount = this.vertexCount;

      return buffer;
   }

   this.bufferColors = function() {
      var buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.colors, gl.STATIC_DRAW);
      buffer.colorCount = this.colorCount;

      return buffer;
   }
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
 * draws the item
 */
Item.prototype.draw = function() {
   mat4.identity(this.matrix);   

   var bufferVertices = this.bufferVertices(gl);

   gl.bindBuffer(gl.ARRAY_BUFFER, bufferVertices);
   gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

   var bufferColors = this.bufferColors(gl);
   gl.bindBuffer(gl.ARRAY_BUFFER, bufferColors);
   gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);

   setMatrixUniforms(gl, shaderProgram);
   gl.drawArrays(gl.TRIANGLE_STRIP, 0, bufferVertices.vertexCount);
}


Item.prototype.animate = function() {
//   this.animation();
}


////////////////////////////////////////////////////////////////////////////////////////////////////
// element driven item


/**
 * @param   vertices       array of vertex descriptions
 * @param   vertexIndices  array of indices in the vertices describing elements
 * @param   colors         array of color descriptions
 */
function ItemElements(vertices, vertexIndices, colors, animation) {
   Item.call(this, vertices, colors, animation);

   this.vertexIndices = new Uint16Array(vertexIndices);   

   this.bufferVertexIndices = function() {
      var buffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndices, gl.STATIC_DRAW);

      return buffer;
   }
}

ItemElements.prototype = Object.create(Item.prototype);
ItemElements.prototype.constructor = ItemElements;


ItemElements.prototype.draw = function() {
   mat4.identity(this.matrix);   

   var bufferVertices = this.bufferVertices(gl);

   gl.bindBuffer(gl.ARRAY_BUFFER, bufferVertices);
   gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

   var bufferColors = this.bufferColors(gl);
   gl.bindBuffer(gl.ARRAY_BUFFER, bufferColors);
   gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);

   var bufferVertexIndices = this.bufferVertexIndices();
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferVertexIndices);

   setMatrixUniforms();
   gl.drawElements(gl.TRIANGLES, this.vertexIndices.length, gl.UNSIGNED_SHORT, 0);
}


////////////////////////////////////////////////////////////////////////////////////////////////////
// shapes


/**
 * @param   s              size of an edge of the cube
 */
function Cube(s, colors, animation) {
   ItemElements.call(this, [
         0,  0,  s,     s,  0,  s,     s,  s,  s,     0,  s,  s,
         0,  0,  0,     0,  s,  0,     s,  s,  0,     s,  0,  0,
         0,  s,  0,     0,  s,  s,     s,  s,  s,     s,  s,  0,
         0,  0,  0,     s,  0,  0,     s,  0,  s,     0,  0,  s,
         s,  0,  0,     s,  s,  0,     s,  s,  s,     s,  0,  s,
         0,  0,  0,     0,  0,  s,     0,  s,  s,     0,  s,  0
     ], [ // front back top bottom right left
         0,  1,  2,  0,  2,  3, 
         4,  5,  6,  4,  6,  7, 
         8,  9, 10,  8, 10, 11, 
        12, 13, 14, 12, 14, 15,
        16, 17, 18, 16, 18, 19, 
        20, 21, 22, 20, 22, 23  
      ], colors, animation);
}

Cube.prototype = Object.create(ItemElements.prototype);
Cube.prototype.constructor = Cube;


/**
 * @param   radius         radius of the circle to create
 * @param   bands          number of sections to split the sphere into
 */
function Sphere(radius, bands, colors, animation) {
   var vertices = [], normals = [], textureCoord = [];

   // latitudes
   for (var slice = 0; slice <= bands; slice++) {
      var theta = slice * Math.PI / bands,
          sinTheta = Math.sin(theta),
          cosTheta = Math.cos(theta);

      // longitudes
      for (var arc = 0; arc <= bands; arc++) {
         var phi = arc * 2 * Math.PI / bands,
             sinPhi = Math.sin(phi),
             cosPhi = Math.cos(phi);

         var x = cosPhi * sinTheta,
             y = cosTheta,
             z = sinPhi * sinTheta,
             u = 1 - (arc / bands),
             v = 1 - (slice / bands);

         normals.push(x, y, z);
         textureCoord.push(u, v);
         vertices.push(radius * x, radius * y, radius * z);
      }
   }

   var vertexIndices = [];
   for (var slice = 0; slice < bands; slice++) {
      for (var arc = 0; arc < bands; arc++) {
         var first = (slice * (bands + 1)) + arc,
             second = first + bands + 1;

         vertexIndices.push(first, second, first + 1, second, second + 1, first + 1);
      }
   }

   ItemElements.call(this, vertices, vertexIndices, colors, animation);
}

Sphere.prototype = Object.create(ItemElements.prototype);
Sphere.prototype.constructor = Sphere;


////////////////////////////////////////////////////////////////////////////////////////////////////
// tools


function setMatrixUniforms() {
   gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
   gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

