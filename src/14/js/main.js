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
      position : [0, 0, -50],
      angleMouse : [0, 0],
      angleKeyboard: [0, 0]
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
   program.samplerColorUniform = gl.getUniformLocation(program, 'uSamplerColor');
   program.samplerSpecularUniform = gl.getUniformLocation(program, 'uSamplerSpecular');
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
   gl.uniform1i(program.samplerColorUniform, 0);
   gl.uniform1i(program.samplerSpecularUniform, 1);
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
            new Rings(current.rings.size, TEXTUREPATH + current.rings.textureURL, 
               TEXTUREPATH + current.rings.specularURL) : 
            null;
         
         result[i] = current.type === 'Star' ? 
            new Star(current.radius, TEXTUREPATH + current.textureURL, 
               TEXTUREPATH + current.specularURL, current.daysPerYear, 
               generateItems(current.satellites)) :
            new Planet(current.radius, TEXTUREPATH + current.textureURL, 
               TEXTUREPATH + current.specularURL, current.distance, current.eccentricity, 
               current.movementY, current.velocity, current.daysPerYear, current.axis, rings, 
               generateItems(current.satellites));
      }

      return result;
   })(JSON.parse(request.responseText));
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
         case 37 :
            pMovement.angleKeyboard[0] -= .01;
            break;
         case 38 :
            smoothMovement(true);
            break;
         case 39 :
           pMovement.angleKeyboard[0] += .01;
           break;
         case 40 :
            break;
      }
   }

   function handleKeyUp(event) {
      switch (event.keyCode) {
         case 38 :
            smoothMovement(false);
            break;
      }
   }


   /**
    * @param   keyDown        boolean whether the key is down
    */
   function smoothMovement(keyDown) { 
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
            pMovement.position[0] -= weight * 
               Math.sin((Math.PI / 2) + pMovement.angleMouse[1] + pMovement.angleKeyboard[1]) * 
               Math.sin(pMovement.angleMouse[0] + pMovement.angleKeyboard[0]);

            pMovement.position[1] -= weight * 
               Math.cos((Math.PI / 2) + pMovement.angleMouse[1] + pMovement.angleKeyboard[1]); 

            pMovement.position[2] -= weight * 
               Math.sin((Math.PI / 2) + pMovement.angleMouse[1] + pMovement.angleKeyboard[1]) * 
               Math.cos(Math.PI + pMovement.angleMouse[0] + pMovement.angleKeyboard[0]); 
          
         }, FRAMETIME);
      }
   }


   function handleMouse(event) {
      pMovement.angleMouse = [
         Math.PI * ((event.clientX / canvas.width) - .5),
         Math.PI * ((event.clientY / canvas.height) - .5)];
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

   mat4.rotate(pMatrix, pMatrix, pMovement.angleKeyboard[1] + pMovement.angleMouse[1], [1, 0, 0]);
   mat4.rotate(pMatrix, pMatrix, pMovement.angleKeyboard[0] + pMovement.angleMouse[0], [0, 1, 0]);

   
   mat4.translate(pMatrix, pMatrix, pMovement.position)

   // moving the perspective based on cursor location


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

