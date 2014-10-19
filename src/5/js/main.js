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

   items = [new Cube(1, 'texture/nehe.gif')];

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

   // shader for interpolating across textures
   shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, 'aTextureCoord');
   gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

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

//      for (var i = 0; i < items.length; i++) {
//         items[i].animate();
//      }
   }
   animate.timeLast = timeNow;
}


/**
 *
 */
function drawScene() {
   gl.viewport(0, 0, gl.width, gl.height);
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

   mat4.perspective(pMatrix, 45, gl.width / gl.height, 0.1, 100);
 
   // moving the perspective based on cursor location
   mat4.translate(pMatrix, pMatrix, [0, 0, -7])
   mat4.rotate(pMatrix, pMatrix, -.5 + pMovement.x, [0, 1, 0]);
   mat4.rotate(pMatrix, pMatrix, -.5 + pMovement.y, [1, 0, 0]);
   mat4.translate(pMatrix, pMatrix, [0, 0, 7])

   // basic order of things is - move the origin via a series of matrices, draw, then reset origin


   // cube
   items[0].pushMatrix([
         mat4.translate(mvMatrix, mvMatrix, [1, 0, -5]),
         mat4.rotate(mvMatrix, mvMatrix, 1, [1, 1, 0])]);

   items[0].draw();
   mvMatrix = mat4.create();

}

////////////////////////////////////////////////////////////////////////////////////////////////////
// items class


/**
 * @param   vertices       array of vertex descriptions
 * @param   colors         array of color descriptions
 */
function Item(vertices, textureURL, textureCoord, animation) {
   this.vertices = new Float32Array(vertices);
   this.vertexCount = vertices.length / 3;
   
   if (textureURL) {
      this.texture = gl.createTexture();
      this.texture.image = new Image();

      // passing texture to function
      _texture = this.texture;

      this.texture.image.onload = function() {

         gl.bindTexture(gl.TEXTURE_2D, _texture);
         gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
         gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, _texture.image);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
         gl.bindTexture(gl.TEXTURE_2D, null);
      }

      this.texture.image.src = textureURL;

      this.textureCoord = new Float32Array(textureCoord);
      this.textureCoordCount = textureCoord.length / 2;
   }


   this.animation = animation;
   this.matrix = mat4.create();

   
   this.bufferVertices = function() {
      var buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
      buffer.vertexCount = this.vertexCount;

      return buffer;
   }

   this.bufferTextureCoord = function() {
      var buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.textureCoord, gl.STATIC_DRAW);
      buffer.textureCoordCount = this.textureCoordCount;

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
     
   var bufferTextureCoord = this.bufferTextureCoord();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffertextureCoord);
   gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, this.texture);
   gl.uniform1i(shaderProgram.samplerUniform, 0);

   setMatrixUniforms(gl, shaderProgram);
   gl.drawArrays(gl.TRIANGLE_STRIP, 0, bufferVertices.vertexCount);
}


////////////////////////////////////////////////////////////////////////////////////////////////////
// element driven item decorator


/**
 * @param   vertices       array of vertex descriptions
 * @param   vertexIndices  array of indices in the vertices describing elements
 * @param   colors         array of color descriptions
 */
function ItemElements(vertices, vertexIndices, textureURL, textureCoord, animation) {
   Item.call(this, vertices, textureURL, textureCoord, animation);

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

   var bufferVertexIndices = this.bufferVertexIndices();
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferVertexIndices);

   var bufferTextureCoord = this.bufferTextureCoord();
   gl.bindBuffer(gl.ARRAY_BUFFER, bufferTextureCoord);
   gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, this.texture);
   gl.uniform1i(shaderProgram.samplerUniform, 0);


   
   setMatrixUniforms();
   gl.drawElements(gl.TRIANGLES, this.vertexIndices.length, gl.UNSIGNED_SHORT, 0);
}


////////////////////////////////////////////////////////////////////////////////////////////////////
// shapes


/**
 * @param   s              size of an edge of the cube
 */
function Cube(s, textureURL, animation) {
   // all values given in order: front back top bottom right left

   ItemElements.call(this, [
         0,  0,  s,     s,  0,  s,     s,  s,  s,     0,  s,  s,
         0,  0,  0,     0,  s,  0,     s,  s,  0,     s,  0,  0,
         0,  s,  0,     0,  s,  s,     s,  s,  s,     s,  s,  0,
         0,  0,  0,     s,  0,  0,     s,  0,  s,     0,  0,  s,
         s,  0,  0,     s,  s,  0,     s,  s,  s,     s,  0,  s,
         0,  0,  0,     0,  0,  s,     0,  s,  s,     0,  s,  0
     ], [ 
         0,  1,  2,  0,  2,  3, 
         4,  5,  6,  4,  6,  7, 
         8,  9, 10,  8, 10, 11, 
        12, 13, 14, 12, 14, 15,
        16, 17, 18, 16, 18, 19, 
        20, 21, 22, 20, 22, 23  
      ], textureURL, [
         0,  0,         1,  0,         1,  1,         0,  1,
         1,  0,         1,  1,         0,  1,         0,  0,
         0,  1,         0,  0,         1,  0,         1,  1,
         1,  1,         0,  1,         0,  0,         1,  0,
         1,  0,         1,  1,         0,  1,         0,  0,
         0,  0,         1,  0,         1,  1,         0,  1
      ], animation);
}

Cube.prototype = Object.create(ItemElements.prototype);
Cube.prototype.constructor = Cube;


/**
 * @param   radius         radius of the circle to create
 * @param   bands          number of sections to split the sphere into
 */
function Sphere(radius, bands, textureURL, animation) {
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

         vertices.push(radius * x, radius * y, radius * z);
         textureCoord.push(u, v);
         normals.push(x, y, z);
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

   ItemElements.call(this, vertices, vertexIndices, textureURL, textureCoord, animation);
}

Sphere.prototype = Object.create(ItemElements.prototype);
Sphere.prototype.constructor = Sphere;


////////////////////////////////////////////////////////////////////////////////////////////////////
// tools


function setMatrixUniforms() {
   gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
   gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

