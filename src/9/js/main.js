/**
 * @author (gij2) gideon mw jones
 * @created 2014-10-15
 * @notes
 *    should run at 60fps
 *    100 seconds = 1 year (60 days)
 */

'use strict';


// frameworks
var gl, 
   shaderProgram, 
   mvMatrix = mat4.create(), 
   mvMatrixStack = [],
   pMatrix = mat4.create(), 
   pMovement = { 
      x : .5, 
      y : .5,
      scroll : -5
   }; 

// content
var items; 


////////////////////////////////////////////////////////////////////////////////////////////////////
// initialisation


window.onload = function initialise() {
   var can = document.getElementById('can'), 
      loop = { 
         handle : null,
         func : function tick() {
            requestAnimationFrame(drawScene);
         },
         timer : 1000 / 60
      };

   initialiseGL(can);
   initialiseShaders();
   initialiseControls(can, loop);

   items = {
      sun : new Planet(1, 'texture/sunmap.jpg', 0, -100, 1, true),
      mercury : new Planet(.2, 'texture/mercurymap.jpg', 2, 100, 30, false)
   };
 
   gl.clearColor(0, 0, 0, 1);
   gl.enable(gl.DEPTH_TEST);

   loop.handle = setInterval(loop.func, loop.timer);
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
 * does what it says on the tin
 */
function initialiseShaders() {
   var shaderFragment = getShader(gl, 'shader-fs'),
      shaderVertex = getShader(gl, 'shader-vs');
   
   shaderProgram = gl.createProgram();

   gl.attachShader(shaderProgram, shaderVertex);
   gl.attachShader(shaderProgram, shaderFragment);
   gl.linkProgram(shaderProgram);

   if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.error('could not initialise shaders');
   }

   gl.useProgram(shaderProgram);

   shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
   gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

   shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, 'aVertexNormal');
   gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

   shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, 'aTextureCoord');
   gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

   shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, 'uPMatrix');
   shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, 'uMVMatrix');
   shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, 'uNMatrix');
   shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, 'uSampler');
   shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram, 'uUseLighting');
   shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, 'uAmbientColor');
   shaderProgram.pointLightingLocationUniform = gl.getUniformLocation(shaderProgram, 'uPointLightingLocation');
   shaderProgram.pointLightingColorUniform = gl.getUniformLocation(shaderProgram, 'uPointLightingColor');
}


function initialiseControls(can, loop) {

   can.addEventListener('mousemove', rotatePerspective, false);

   can.addEventListener('DOMMouseScroll', zoomPerspective, false);
   can.addEventListener('mousewheel', zoomPerspective, false);

   can.addEventListener('click', togglePause, false);

   // perspective shifting
   function rotatePerspective(eve) {
      var rect = eve.target.getBoundingClientRect(),
         can = eve.srcElement;

      pMovement.x = (eve.clientX - rect.left) / can.width;
      pMovement.y = (eve.clientY - rect.top) / can.height;
   }

   // zooming
   function zoomPerspective(eve) {
      eve.preventDefault();
      pMovement.scroll += eve.wheelDelta  > 0 || eve.detail < 0 ?
         .3 : -.3;
   }

   // toggles the pausing of the program
   function togglePause(eve) {
      if (typeof togglePause.paused == 'undefined') {
         togglePause.paused = false;
      } 
      
      if (togglePause.paused) {
         togglePause.paused = false;
         loop.handle = setInterval(loop.func, loop.timer);
      } else {
         togglePause.paused = true;
         clearInterval(loop.handle);
      }
   }
}


////////////////////////////////////////////////////////////////////////////////////////////////////
// animation


/**
 * assembles & draws the items of the scene
 */
function drawScene() {
   gl.viewport(0, 0, gl.width, gl.height);
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

   mat4.perspective(pMatrix, 45, gl.width / gl.height, .1, 100);
   mat4.translate(pMatrix, pMatrix, [0, 0, pMovement.scroll])

   // lighting
   gl.uniform3f(shaderProgram.ambientColorUniform, .1, .1, .1);  
   gl.uniform3f(shaderProgram.pointLightingUniform,  0, 0, 0);
   gl.uniform3f(shaderProgram.pointLightingColorUniform, .9, .9, .9);

   // moving the perspective based on cursor location
   mat4.rotate(pMatrix, pMatrix, -.5 + pMovement.x, [0, 1, 0]);
   mat4.rotate(pMatrix, pMatrix, -.5 + pMovement.y, [1, 0, 0]);

   // basic order of things is - move the origin via a series of matrices, draw, then reset origin
   for (var key in items) {
      mvMatrixPush();
      items[key].animation(16);
      items[key].draw();
      mvMatrixPop();
   }
}


////////////////////////////////////////////////////////////////////////////////////////////////////
// element driven item decorator


/**
 * @super   Item
 * @param   vertices       array of vertex descriptions
 * @param   vertexIndices  array of indices in the vertices describing elements
 */
function ItemElements(vertices, vertexIndices, normals, textureURL, textureCoord, animation) {
   this.vertices = new Float32Array(vertices);
   this.vertexCount = vertices.length / 3;
   
   this.vertexIndices = new Uint16Array(vertexIndices);   
   
   this.normals = new Float32Array(normals);
   this.normalsCount = normals.length / 3;

   this.texture = gl.createTexture();
   this.texture.image = new Image();
   this.texture.image.src = textureURL;

   // passing texture to function
   var _texture = this.texture;

   // finishing initialisation after loading resource
   this.texture.image.onload = function() {
      gl.bindTexture(gl.TEXTURE_2D, _texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, _texture.image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.bindTexture(gl.TEXTURE_2D, null);
   }

   this.textureCoord = new Float32Array(textureCoord);
   this.textureCoordCount = textureCoord.length / 2;

   this.animation = animation;
   this.positionMatrix = mat4.create();
  

   this.bufferVertices = function() {
      var buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
      buffer.count = this.vertexCount;
      return buffer;
   }
   
   this.bufferVertexIndices = function() {
      var buffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndices, gl.STATIC_DRAW);
      return buffer;
   }

   this.bufferNormals = function() {
      var buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);
      buffer.count = this.normalsCount;
      return buffer;
   }

   this.bufferTextureCoord = function() {
      var buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.textureCoord, gl.STATIC_DRAW);
      buffer.count = this.textureCoordCount;
      return buffer;
   }    
}


ItemElements.prototype.draw = function() {
   this.position();

   var bufferVertices = this.bufferVertices();
   gl.bindBuffer(gl.ARRAY_BUFFER, bufferVertices);
   gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

   var bufferVertexIndices = this.bufferVertexIndices();
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferVertexIndices);

   var bufferNormals = this.bufferNormals();     
   gl.bindBuffer(gl.ARRAY_BUFFER, bufferNormals);
   gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
   
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
 * @super   ItemElements
 * @param   radius         radius of the circle to create
 * @param   flipNormals    boolean whether or not to invert the normals
 */
function Sphere(radius, textureURL, position, animation, flipNormals) {
   var bands = 30, 
      vertices = [], 
      normals = [], 
      textureCoord = [];

   this.position = position;

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
         flipNormals ? 
            normals.push(-x, -y, -z) :
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

   ItemElements.call(this, vertices, vertexIndices, normals, textureURL, textureCoord, animation);
}

Sphere.prototype = Object.create(ItemElements.prototype);
Sphere.prototype.constructor = Sphere;



/**
 * @param   radius         radius length of the planet
 * @param   textureURL     texture resource path
 * @param   distance       distance from the origin to orbit
 * @param   yearLength     length of time for the planet to orbit origin in seconds
 * @param   daysPerYear    number days in that year
 * @param   sun            boolean whether the planet is a sun
 */
function Planet(radius, textureURL, distance, yearLength, daysPerYear, sun) {
   Sphere.call(this, radius, textureURL, function position() {
        mat4.translate(mvMatrix, mvMatrix, [0, 0, distance]);

      }, function(elapsed) {
         if (typeof this.animation.year === 'undefined') {
            this.animation.year = 0;     
         }
     
         // yearLength (seconds) * (pie / 2) / (1000 ms / 60 frames)
         this.animation.year += (1 / yearLength) * Math.PI / (1000 / 30);
         
         mat4.rotate(mvMatrix, mvMatrix, this.animation.year, [0, 1, 0]);

         mat4.translate(mvMatrix, mvMatrix, [0, 0, distance]);
         mat4.rotate(mvMatrix, mvMatrix, this.animation.year * daysPerYear, [0, 1, 0]);
         mat4.translate(mvMatrix, mvMatrix, [0, 0, -distance]); 
      }, sun);
}


Planet.prototype = Object.create(Sphere.prototype);
Planet.prototype.constructor = Planet;


////////////////////////////////////////////////////////////////////////////////////////////////////
// tools


function setMatrixUniforms() {
   gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
   gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
 
   var nMatrix = mat3.create();
   mat3.normalFromMat4(nMatrix, mvMatrix);  
   gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}


function mvMatrixPush() {
   var copy = mat4.create();
   mat4.copy(copy, mvMatrix);
   mvMatrixStack.push(copy);
}


function mvMatrixPop() {
   if (mvMatrixStack.length == 0) {
      throw 'Invalid popMatrix!';
   }
   mvMatrix = mvMatrixStack.pop();
}

