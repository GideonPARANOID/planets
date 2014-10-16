////////////////////////////////////////////////////////////////////////////////////////////////////
// initialisation


var gl, shaderProgram, items, mvMatrix = mat4.create(), pMatrix = mat4.create();
   

window.onload = function initialise() {
   var can = document.getElementById('can');


  colors = [
      [1.0, 0.0, 0.0, 1.0],     // Front face
      [1.0, 1.0, 0.0, 1.0],     // Back face
      [0.0, 1.0, 0.0, 1.0],     // Top face
      [1.0, 0.5, 0.5, 1.0],     // Bottom face
      [1.0, 0.0, 1.0, 1.0],     // Right face
      [0.0, 0.0, 1.0, 1.0],     // Left face
    ];
    var unpackedColors = [];
    for (var i in colors) {
      var color = colors[i];
      for (var j=0; j < 4; j++) {
        unpackedColors = unpackedColors.concat(color);
      }
    } 
   
   initialiseGL(can);
   initialiseShaders();

   items = initialiseItems([new Item([
        0,   1,   0,
       -1,  -1,   0,
        1,  -1,   0
   ], 3, [
        1,   0,   0,   1,
        0,   1,   0,   1,
        0,   0,   1,   1
   ], 4), new Item([
        1,   1,   0,
       -1,   1,   0,
        1,  -1,   0,
       -1,  -1,   0
   ], 3, [
        1,   0,   0,   1,
        0,   1,   0,   1,
        1,   0,   1,   1,
        1,   0,   1,   1
   ], 4), new Cube([
      // front face
      -1.0, -1.0,  1.0,
       1.0, -1.0,  1.0,
       1.0,  1.0,  1.0,
      -1.0,  1.0,  1.0,

      // back face
      -1.0, -1.0, -1.0,
      -1.0,  1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0, -1.0, -1.0,

      // top face
      -1.0,  1.0, -1.0,
      -1.0,  1.0,  1.0,
       1.0,  1.0,  1.0,
       1.0,  1.0, -1.0,

      // bottom face
      -1.0, -1.0, -1.0,
       1.0, -1.0, -1.0,
       1.0, -1.0,  1.0,
      -1.0, -1.0,  1.0,

      // right face
       1.0, -1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0,  1.0,  1.0,
       1.0, -1.0,  1.0,

      // left face
      -1.0, -1.0, -1.0,
      -1.0, -1.0,  1.0,
      -1.0,  1.0,  1.0,
      -1.0,  1.0, -1.0
      ], 3, [
      0, 1, 2,      0, 2, 3,    // Front face
      4, 5, 6,      4, 6, 7,    // Back face
      8, 9, 10,     8, 10, 11,  // Top face
      12, 13, 14,   12, 14, 15, // Bottom face
      16, 17, 18,   16, 18, 19, // Right face
      20, 21, 22,   20, 22, 23  // Left face
      ], unpackedColors, 4)]);
 
   
   gl.clearColor(0.0, 0.0, 0.0, 1.0);
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
   var fragmentShader = getShader('shader-fs'),
       vertexShader = getShader('shader-vs');
   
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

   mat4.perspective(pMatrix, 90, gl.width / gl.height, 0.1, 100.0);

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
   items[1].pushMatrix([
         mat4.translate(mvMatrix, mvMatrix, [1, 0, -5]),
         mat4.rotate(mvMatrix, mvMatrix, 1, [1, 1, 0])]);

   items[2].draw();
   mvMatrix = mat4.create();
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// items class


/**
 * @param   vertices       array of vertex descriptions
 * @param   vertexLength   length of vertex description
 *
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
 * @return                 webgl buffer of the instance called upon
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
 * @return                 webgl buffer of the instance called upon
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
 *
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


Cube.prototype.bufferVertexIndices = function() {
   var buffer = gl.createBuffer();
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndices, gl.STATIC_DRAW);

   return buffer;
}


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
// tools


function setMatrixUniforms() {
   gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
   gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}



/**
 * @param   gl             webgl context object
 * @param   id             id of dom object containing shader
 * @return                 shader program
 */
function getShader(id) {
   var shader;

   try {
      var shaderScript = document.getElementById(id);

      if (!shaderScript) {
         throw Exception();
      }

      var str = '';
      var k = shaderScript.firstChild;
      while (k) {
         if (k.nodeType == 3) {
            str += k.textContent;
         }
         k = k.nextSibling;
      }

      switch (shaderScript.type) {
         case 'x-shader/x-fragment' : 
            shader = gl.createShader(gl.FRAGMENT_SHADER);
            break;
         case 'x-shader/x-vertex' :
            shader = gl.createShader(gl.VERTEX_SHADER);
            break;
      }
        
      gl.shaderSource(shader, str);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
         throw new Exception(gl.getShaderInfoLog(shader));
      }

   } catch (exception) {
      console.error(exeception.getMessage());

   } finally {
      return shader;
   }
}



/**
 * @return  object         description of viewport dimensions 
 */
function getViewportDimensions() {
   var e = window, a = 'inner';

   if (!('innerWidth' in window)) {
      a = 'client';
      e = document.documentElement || document.body;
   }
   return { 
      w : e[a + 'Width'], 
      h : e[a + 'Height']
   };
}

