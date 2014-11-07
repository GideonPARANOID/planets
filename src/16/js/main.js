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
   pMove = { // [x, y, z]
      position : [0, 0, -50],
      angleMouse : [0, 0],
      angleKeyboard: [0, 0]
   },
   paused = false;

// constants
var SHADERPATH = 'shader/',
   TEXTUREPATH = 'texture/',
   DATAPATH = 'data/',
   FRAMETIME = 1000 / 40,
   BOUNDS = 100,
   DRAWDISTANCE = Math.sqrt(Math.pow(BOUNDS * 2, 2) * 3),
   CUBIVERSE = false; // 'minecraft mode'

// content
var items = [],
    background;


////////////////////////////////////////////////////////////////////////////////////////////////////
// initialisation


window.onload = initialise;

function initialise() {
   var canvas = document.getElementById('can');

   initialiseGL(canvas);
   initialiseProgram(SHADERPATH + 'per-frag-frag.gsgl', SHADERPATH + 'per-frag-vert.gsgl');

   gl.clearColor(0, 0, 0, 1);
   gl.enable(gl.DEPTH_TEST);
   gl.useProgram(program);

   initialiseLighting();
   initialiseItems(DATAPATH + 'solarsystem.json'); 
   initialiseBackground();

   initialiseControls(canvas);

   initialise.loop = setInterval(function tick() {
         requestAnimationFrame(drawScene);
      }, FRAMETIME);
}



/**
 * @param   canvas         canvas dom object
 */
function initialiseGL(canvas) {
   try {
      gl = canvas.getContext('experimental-webgl');

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
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
      throw 'could not initialise shaders';
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
   program.samplerColorMapUniform = gl.getUniformLocation(program, 'uSamplerColorMap');
   program.samplerSpecularMapUniform = gl.getUniformLocation(program, 'uSamplerSpecularMap');
   program.useSpecularMapUniform = gl.getUniformLocation(program, 'uUseSpecularMap');
   program.useDarkMapUniform = gl.getUniformLocation(program, 'uUseDarkMap');
   program.samplerDarkMapUniform = gl.getUniformLocation(program, 'uSamplerDarkMap');
   program.ambientColorUniform = gl.getUniformLocation(program, 'uAmbientColor');
   program.materialShininessUniform = gl.getUniformLocation(program, 'uMaterialShininess');
   program.materialEmissiveColorUniform = gl.getUniformLocation(program, 'uMaterialEmissiveColor');
   program.pointLightingLocationUniform = gl.getUniformLocation(program, 'uPointLightingLocation');
   program.pointLightingDiffuseColorUniform = gl.getUniformLocation(program, 'uPointLightingDiffuseColor');
   program.pointLightingSpecularColorUniform = gl.getUniformLocation(program, 'uPointLightingSpecularColor');
}


/**
 * sets default lighting parameters
 */
function initialiseLighting() {
   gl.uniform3f(program.pointLightingLocationUniform,  0, 0, 0);
   gl.uniform3f(program.pointLightingDiffuseColorUniform, .5, .5, .5);
   gl.uniform3f(program.pointLightingSpecularColorUniform, .5, .5, .5);
   gl.uniform1i(program.samplerColorMapUniform, 0);
   gl.uniform1i(program.samplerSpecularMapUniform, 1);
   gl.uniform1i(program.samplerDarkMapUniform, 0);
   gl.uniform3f(program.ambientColorUniform, .1, .1, .1);  
   gl.uniform3f(program.materialEmissiveColorUniform, 0, 0, 0);
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
         var current = json[i], rings = current.rings ? 
            new Rings(current.rings.size, genPathT(current.rings.colorMapURL)) : 
            null;
        
         result[i] = current.type === 'Star' ? 
            new Star(current.radius, genPathT(current.colorMapURL), current.daysPerYear, 
               generateItems(current.satellites)) :
            new Planet(current.radius, genPathT(current.colorMapURL), 
               genPathT(current.specularMapURL), genPathT(current.darkMapURL), current.distance, 
               current.eccentricity, current.movementY, current.velocity, current.daysPerYear, 
               current.axis, rings, generateItems(current.satellites));
      }

      return result;
   })(JSON.parse(request.responseText));
}


function initialiseBackground() {

   // https://secure.flickr.com/photos/chrisser/7061523009/
   background = new Cube(BOUNDS * 2, TEXTUREPATH + 'outerspace.jpg', null,
         null, null);
}


/**
 * @param   canvas         canvas element to assign controls to
 */
function initialiseControls(canvas) {
   document.addEventListener('keydown', handleKeyDown, false);
   document.addEventListener('keyup', handleKeyUp, false);
   canvas.addEventListener('mousemove', handleMouse, false);

   function handleKeyDown(event) {
      switch (event.keyCode) {
         case 32:
            paused = !paused;
            break;
         case 37 : case 65 : // left, a
           smoothRotation(true, true);
            break;
         case 38 : case 87 : // up, w 
            smoothMovement(true, true);
            break;
         case 39 : case 68 : // right, d
           smoothRotation(true, false);
           break;
         case 40 : case 83 : // down, s
           smoothMovement(true, false);
            break;
      }
   }

   function handleKeyUp(event) {
      switch (event.keyCode) {
         case 37 : case 65 :
            smoothRotation(false);
            break;
         case 38 : case 87 :
            smoothMovement(false);
            break;
         case 39 : case 68 :
            smoothRotation(false);
            break;
         case 40 : case 83 :
            smoothMovement(false);
            break;
      }
   }


   /**
    * @param   keyDown        boolean whether the key is down
    */
   function smoothMovement(keyDown, direction) { 
      smoothMovement.keyDown = keyDown;
   
      // don't want to start a loop if there's already one on the go
      if (smoothMovement.keyDown && !smoothMovement.loop) {

         smoothMovement.up = Math.PI / 2;
         smoothMovement.down = 0;
         smoothMovement.loop = setInterval(function smooth() {

            var weight = 1;

            // acceleration
            if (smoothMovement.down < Math.PI / 2) {
               weight = Math.cos(smoothMovement.down += (Math.PI / 8));

            // decceleration
            } else if (!smoothMovement.keyDown) {
               weight = Math.cos(smoothMovement.up -= (Math.PI / 8));

               // if we're done, get out
               if (smoothMovement.up <= 0) {
                  clearInterval(smoothMovement.loop);
                  smoothMovement.loop = null;
               }
            }

            // reference: http://www.ewerksinc.com/refdocs/coordinate%20and%20unit%20vector.pdf
            // angles are offset by pi / 2 & pi as we're slightly different to reference
            var delta = [weight * 
                  Math.sin((Math.PI / 2) + pMove.angleMouse[1] + pMove.angleKeyboard[1]) * 
                  Math.sin(pMove.angleMouse[0] + pMove.angleKeyboard[0]),
               weight * 
                  Math.cos((Math.PI / 2) + pMove.angleMouse[1] + pMove.angleKeyboard[1]),
               weight * 
                  Math.sin((Math.PI / 2) + pMove.angleMouse[1] + pMove.angleKeyboard[1]) * 
                  Math.cos(Math.PI + pMove.angleMouse[0] + pMove.angleKeyboard[0])]; 

            
            // applying the movement with direction & clipping at bounds
            for (var i = 0; i < pMove.position.length; i++) {
               pMove.position[i] = Math.min(Math.max(
                     pMove.position[i] - (direction ? delta[i] : -delta[i]), -BOUNDS), BOUNDS);
            }

         }, FRAMETIME);
      }
   }


   /**
    * @param   keyDown        boolean whether the key is down
    */
   function smoothRotation(keyDown, direction) { 
      smoothRotation.keyDown = keyDown;
  
      // don't want to start a loop if there's already one on the go
      if (smoothRotation.keyDown && !smoothRotation.loop) {

         smoothRotation.up = Math.PI / 2;
         smoothRotation.down = 0;
         smoothRotation.loop = setInterval(function smooth() {

            var weight = 1;

            // acceleration
            if (smoothRotation.down < Math.PI / 2) {
               weight = Math.cos(smoothRotation.down += (Math.PI / 8));

            // decceleration
            } else if (!smoothRotation.keyDown) {
               weight = Math.cos(smoothRotation.up -= (Math.PI / 8));

               // if we're done, get out
               if (smoothRotation.up <= 0) {
                  clearInterval(smoothRotation.loop);
                  smoothRotation.loop = null;
               }
            }
            
            var delta = weight * .025;
            pMove.angleKeyboard[0] += direction ? -delta : delta;

         }, FRAMETIME);
      }
   }



   function handleMouse(event) {
      var mouse = [
         (event.clientX / canvas.width),
         (event.clientY / canvas.height) 
      ];

      if (mouse[0] <= 0  && !handleMouse.loop) {
         smoothRotation(true, true);
      } else if (mouse[0] >= 1 && !handleMouse.loop) {
         smoothRotation(true, false);
      } else {
         smoothRotation(false);
      }

      pMove.angleMouse = [
         Math.PI * (mouse[0] - .5),
         Math.PI * (mouse[1] - .5)];
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

   // the bounds are a cube, so use pythagoras to make sure we never lose the boundary texture
   mat4.perspective(pMatrix, 45, gl.width / gl.height, .1, DRAWDISTANCE);

   mat4.rotate(pMatrix, pMatrix, pMove.angleKeyboard[1] + pMove.angleMouse[1], [1, 0, 0]);
   mat4.rotate(pMatrix, pMatrix, pMove.angleKeyboard[0] + pMove.angleMouse[0], [0, 1, 0]);
 
   mat4.translate(pMatrix, pMatrix, pMove.position)
   
   background.draw();

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

/**
 * @param   fileName       string filename
 * @return                 string filepath or null
 */
function genPathT(fileName) {
   return fileName ? TEXTUREPATH + fileName : null;
}
