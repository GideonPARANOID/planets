/**
 * @author (gij2) gideon mw jones
 * @created 2014-10-15
 */

'use strict';


// frameworks
var gl, 
   program,
   mvMatrix = mat4.create(), 
   mvMatrixStack = [],
   pMatrix = mat4.create(), 
   pMovement = { // default mouse position assumes the middle of the screen
      x : .5, 
      y : .5,
      z : .5,
      scroll : -50
   },
   paused = false;

// constants
var SHADERPATH = 'shader/',
   TEXTUREPATH = 'texture/',
   DATAPATH = 'data/',
   FRAMETIME = 1000 / 60,
   CUBIVERSE = 0; // 'minecraft mode'

// content
var items = [];

////////////////////////////////////////////////////////////////////////////////////////////////////
// initialisation

var old = [];
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

   gl.clearColor(0, 0, 0, 1);
   gl.enable(gl.DEPTH_TEST);

   gl.useProgram(program);
   initialiseLighting();
   
   initialiseControls(can, loop);

   initialiseItems(DATAPATH + 'solarsystem.json');

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
      request.open('GET', url, false);
      request.send();

      gl.shaderSource(shader, request.responseText);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
         throw gl.getShaderInfoLog(shader);
      }

      return shader; 
   }


   program = gl.createProgram();

   var shaderFragment = getShader(gl, fragmentShaderURL, gl.FRAGMENT_SHADER),
      shaderVertex = getShader(gl, vertexShaderURL, gl.VERTEX_SHADER);
      
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


/**
 * @param   url            string url of json file describing items 
 */ 
function initialiseItems(url) {
   var request = new XMLHttpRequest();

   request.open('GET', url, false);
   request.send();

   // recursively generates a list of planets/stars with their satellites from json
   items = (function generateItems(json) {
      var result = [];

      for (var i = 0; i < json.length; i++) {
         var current = json[i], rings;

         var rings = current.rings ? new Rings(current.rings.size, TEXTUREPATH + current.rings.textureURL) : null;
         

         result[i] = current.type === 'Star' ? 
            new Star(current.radius, TEXTUREPATH + current.textureURL, current.daysPerYear, 
               generateItems(current.satellites)) :
            new Planet(current.radius, TEXTUREPATH + current.textureURL, current.distance, 
               current.eccentricity, current.movementY, current.velocity, current.daysPerYear,
               current.axis, rings, generateItems(current.satellites));
      }

      return result;
   })(JSON.parse(request.responseText));
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


function initialiseLighting() {
   gl.uniform3f(program.pointLightingLocationUniform,  0, 0, 0);
   gl.uniform3f(program.pointLightingDiffuseColorUniform, .5, .5, .5);
   gl.uniform3f(program.pointLightingSpecularColorUniform, .5, .5, .5);
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

   // moving the perspective based on cursor location
   mat4.rotate(pMatrix, pMatrix, pMovement.x - .5, [0, 1, 0]);
   mat4.rotate(pMatrix, pMatrix, pMovement.y - .5, [1, 0, 0]);
   //   mat4.rotate(pMatrix, pMatrix, pMovement.z, [0, 0, 1]);



   // basic order of things is - move the origin via a series of matrices, draw, then reset origin
   for (var i = 0; i < items.length; i++) {
      mvMatrixPush();
      items[i].draw();

      mvMatrixPop();
   }
}


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

