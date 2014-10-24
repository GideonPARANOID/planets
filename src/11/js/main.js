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
   program,
   mvMatrix = mat4.create(), 
   mvMatrixStack = [],
   pMatrix = mat4.create(), 
   pMovement = { 
      x : 0, 
      y : 0,
      z : 0,
      scroll : -50
   },
   paused = false;

// constants
var SHADERPATH = 'shader/',
   TEXTUREPATH = 'texture/',
   FRAMETIME = 1000 / 60;

// content
var items; 

var sat;

////////////////////////////////////////////////////////////////////////////////////////////////////
// initialisation


window.onload = function initialise() {
   var can = document.getElementById('can'), 
      loop = { 
         handle : null,
         func : function tick() {
            requestAnimationFrame(drawScene);
         },
      };

   initialiseGL(can);
   initialiseProgram(SHADERPATH + 'per-frag-frag.gsgl', SHADERPATH + 'per-frag-vert.gsgl');
   initialiseControls(can, loop);

   sat = new Planet(1, TEXTUREPATH + 'moon.gif', 4, .2, 250, 150, []);


   items = {
      sun : new Planet(    4,    TEXTUREPATH + 'sunmap.jpg',       0,   0,     -100,    1, []),
//      mercury : new Planet( .2,  TEXTUREPATH + 'mercurymap.jpg',   5,    .5,    100,   30, false),
//      venus : new Planet(   .3,  TEXTUREPATH + 'venusmap.jpg',     7,    .5,   -200,   20, false),
//      earth : new Planet(   .5,  TEXTUREPATH + 'earthmap.jpg',    10,    .1,     80,  -60, false),
//      mars : new Planet(    .6,  TEXTUREPATH + 'marsmap.jpg',     12,    .2,     60,   60, false),
      jupiter : new Planet(2,    TEXTUREPATH + 'jupitermap.jpg',  16,    .1,    100,  100, [sat]),
//      saturn : new Planet( 2.1,  TEXTUREPATH + 'saturnmap.jpg',   22,    .4,    120,  100, false),
//      uranus : new Planet( 1.5,  TEXTUREPATH + 'uranusmap.jpg',   28,   0,       20,  150, false),
//      neptune : new Planet(1.8,  TEXTUREPATH + 'neptunemap.jpg',  35,    .2,     10,  200, false)
   };
 
   gl.clearColor(0, 0, 0, 1);
   gl.enable(gl.DEPTH_TEST);

   loop.handle = setInterval(loop.func, FRAMETIME);
}



/**
 * @param   can            canvas dom object
 */
function initialiseGL(can) {
   try {
      gl = can.getContext('experimental-webgl');

      can.width = window.innerWidth;
      can.height = window.innerHeight;
      gl.width = window.innerWidth;
      gl.height = window.innerHeight;

   } catch (exeception) {
      console.error('could not initialise webgl');
   } 
}


/**
 * does what it says on the tin
 */
function initialiseProgram(fragmentShaderURL, vertexShaderURL) {

   // getting the shader source
   function getShader(gl, url, type) {
      var shader = gl.createShader(type),
         request = new XMLHttpRequest();
      request.open("GET", url, false);
      request.send();

      gl.shaderSource(shader, request.responseText);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
         throw new Exception(gl.getShaderInfoLog(shader));
      }

      return shader; 
   }

   var shaderFragment = getShader(gl, fragmentShaderURL, gl.FRAGMENT_SHADER),
      shaderVertex = getShader(gl, vertexShaderURL, gl.VERTEX_SHADER);
      
   program = gl.createProgram();

   gl.attachShader(program, shaderVertex);
   gl.attachShader(program, shaderFragment);
   gl.linkProgram(program);

   if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('could not initialise shaders');
   }

   program.vertexPositionAttribute = gl.getAttribLocation(program, 'aVertexPosition');
   gl.enableVertexAttribArray(program.vertexPositionAttribute);

   program.vertexNormalAttribute = gl.getAttribLocation(program, 'aVertexNormal');
   gl.enableVertexAttribArray(program.vertexNormalAttribute);

   program.textureCoordAttribute = gl.getAttribLocation(program, 'aTextureCoord');
   gl.enableVertexAttribArray(program.textureCoordAttribute);

   // linking shader variables
   program.pMatrixUniform = gl.getUniformLocation(program, 'uPMatrix');
   program.mvMatrixUniform = gl.getUniformLocation(program, 'uMVMatrix');
   program.nMatrixUniform = gl.getUniformLocation(program, 'uNMatrix');
   program.samplerUniform = gl.getUniformLocation(program, 'uSampler');
   program.ambientColorUniform = gl.getUniformLocation(program, 'uAmbientColor');
   program.materialShininessUniform = gl.getUniformLocation(program, "uMaterialShininess");
   program.pointLightingLocationUniform = gl.getUniformLocation(program, 'uPointLightingLocation');
   program.pointLightingDiffuseColorUniform = gl.getUniformLocation(program, 'uPointLightingDiffuseColor');
   program.pointLightingSpecularColorUniform = gl.getUniformLocation(program, 'uPointLightingSpecularColor');
}


function initialiseControls() {
   document.addEventListener('mousemove', rotatePerspective, false);
   document.addEventListener('mousewheel', zoomPerspective, false);
   document.addEventListener('DOMMouseScroll', zoomPerspective, false);
   document.addEventListener('keypress', togglePause, false);
   
/*   window.addEventListener('deviceorientation', rotatePerspectiveAlt, true);
   function rotatePerspectiveAlt(eve) {
      pMovement.x = eve.gamma / 90;
      pMovement.y = -eve.beta / 90;
      pMovement.z = -eve.alpha / 90;
      console.log(eve);
   }*/

   // perspective shifting
   function rotatePerspective(eve) {
      pMovement.x = eve.clientX / can.width;
      pMovement.y = eve.clientY / can.height;
   }



   // zooming
   function zoomPerspective(eve) {
      eve.preventDefault();
      pMovement.scroll += eve.wheelDelta  > 0 || eve.detail < 0 ? .3 : -.3;
   }

   // toggles the pausing of the program
   function togglePause(eve) {    
       switch (eve.keyCode) {
         case 32 :
            paused = !paused;
            break;
      }
   }
}


////////////////////////////////////////////////////////////////////////////////////////////////////
// animation


/**
 * assembles & draws the items of the scenr
 */
function drawScene() {
   gl.viewport(0, 0, gl.width, gl.height);
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

   mat4.perspective(pMatrix, 45, gl.width / gl.height, .1, 200);
   mat4.translate(pMatrix, pMatrix, [0, 0, pMovement.scroll])

   gl.useProgram(program);

   // lighting
   gl.uniform3f(program.ambientColorUniform, .1, .1, .1);  
   gl.uniform3f(program.pointLightingLocationUniform,  0, 0, 0);
   gl.uniform3f(program.pointLightingDiffuseColorUniform, .5, .5, .5);
   gl.uniform3f(program.pointLightingSpecularColorUniform, .5, .5, .5);

   gl.uniform1i(program.samplerUniform, 0);
   gl.uniform1f(program.materialShininessUniform, 5);

   // moving the perspective based on cursor location
   mat4.rotate(pMatrix, pMatrix, pMovement.x, [0, 1, 0]);
   mat4.rotate(pMatrix, pMatrix, pMovement.y, [1, 0, 0]);
//   mat4.rotate(pMatrix, pMatrix, pMovement.z, [0, 0, 1]);

   // basic order of things is - move the origin via a series of matrices, draw, then reset origin
   for (var key in items) {
      mvMatrixPush();
      items[key].draw();

      for (var i = 0; i < items[key].satellites.length; i++) {
         mvMatrixPush();
         items[key].satellites[i].draw();
         mvMatrixPop();
      }

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
   this.animation();

   var bufferVertices = this.bufferVertices();
   gl.bindBuffer(gl.ARRAY_BUFFER, bufferVertices);
   gl.vertexAttribPointer(program.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

   var bufferVertexIndices = this.bufferVertexIndices();
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferVertexIndices);

   var bufferNormals = this.bufferNormals();     
   gl.bindBuffer(gl.ARRAY_BUFFER, bufferNormals);
   gl.vertexAttribPointer(program.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
   
   var bufferTextureCoord = this.bufferTextureCoord();
   gl.bindBuffer(gl.ARRAY_BUFFER, bufferTextureCoord);
   gl.vertexAttribPointer(program.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, this.texture);

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
function Sphere(radius, textureURL, animation, flipNormals) {
   var bands = 30, 
      vertices = [], 
      normals = [], 
      textureCoord = [];

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
 * @param   eccentricity   eccentricity of the orbit (circle is 0)
 * @param   yearLength     length of time for the planet to orbit origin
 * @param   daysPerYear    number days in that year
 * @param   satellites     array of other Planet objects, drawn relative to this planet
 */
function Planet(radius, textureURL, distance, eccentricity, yearLength, daysPerYear, satellites) {
   this.satellites = satellites;

   Sphere.call(this, radius, textureURL, function() {
         if (typeof this.animation.year === 'undefined') {
            this.animation.day = 0;
            this.animation.year = 0;     
            this.animation.currentDistance = distance;
         }
     
         // if no distance, assume sun
         if (distance) { 
            if (!paused) {
               var velocity = yearLength * .00001;

               // kepler's first law
               this.animation.currentDistance = 
                  (distance * (1 + eccentricity)) / 
                  (1 + (eccentricity * Math.cos(this.animation.year)));

               // kepler's second law
               this.animation.year += (FRAMETIME * distance * distance * velocity) /
                  (this.animation.currentDistance * this.animation.currentDistance);               
            } 
           
            mat4.translate(mvMatrix, mvMatrix, [
               this.animation.currentDistance * Math.sin(this.animation.year), 
               0, 
               this.animation.currentDistance * Math.cos(this.animation.year)]);
          } 

         if (!paused) {
            this.animation.day += daysPerYear * .001;
         }



         // we wouldn't want the spinning of the planet to influence any satellites
         mvMatrixPush();
         mat4.rotate(mvMatrix, mvMatrix, this.animation.day, [0, 1, 0]);
         mvMatrixPop();

      }, !distance);
}


Planet.prototype = Object.create(Sphere.prototype);
Planet.prototype.constructor = Planet;


////////////////////////////////////////////////////////////////////////////////////////////////////
// tools


function setMatrixUniforms() {
   gl.uniformMatrix4fv(program.pMatrixUniform, false, pMatrix);
   gl.uniformMatrix4fv(program.mvMatrixUniform, false, mvMatrix);
 
   var nMatrix = mat3.create();
   mat3.normalFromMat4(nMatrix, mvMatrix);  
   gl.uniformMatrix3fv(program.nMatrixUniform, false, nMatrix);
}


function mvMatrixPush() {
   var copy = mat4.create();
   mat4.copy(copy, mvMatrix);
   mvMatrixStack.push(copy);
}


function mvMatrixPop() {
   mvMatrix = mvMatrixStack.pop();
}

