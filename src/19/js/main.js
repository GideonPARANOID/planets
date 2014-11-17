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
   };

// constants (of sorts)
var SHADERPATH = 'shader/',
   TEXTUREPATH = 'texture/',
   DATAPATH = 'data/',
   FRAMETIME = 1000 / 40,
   BOUNDS = 100,
   DRAWDISTANCE = Math.sqrt(Math.pow(BOUNDS * 2, 2) * 3),
   CUBIVERSE = false, // 'minecraft mode'
   PAUSED = false,
   DRAWORBIT = true;

// content
var items = [],
    background;


////////////////////////////////////////////////////////////////////////////////////////////////////
// initialisation


window.onload = initialise;

function initialise() {
   var canvas = document.getElementById('can');

   screenshot(canvas);

   initialiseGL(canvas);
   initialiseProgram(SHADERPATH + 'per-frag-frag.glsl', SHADERPATH + 'per-frag-vert.glsl');

   gl.clearColor(0, 0, 0, 1);
   gl.enable(gl.DEPTH_TEST);
   gl.useProgram(program);

   initialiseLighting();
   initialiseItems(DATAPATH + 'solarsystem.json'); 
   initialiseBackground();

   initialiseControls(canvas);

   initialiseLoop();
}



/**
 * @param   canvas         canvas dom object
 */
function initialiseGL(canvas) {
   try {
      gl = canvas.getContext('experimental-webgl', {
            preserveDrawingBuffer : true});

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.width = window.innerWidth;
      gl.height = window.innerHeight;

   } catch (exeception) {
      console.error('could not initialise webgl');
   } 
}


/**
 * @param   fragShaderURL  string location of shader file
 * @param   vertShaderURL  string location of shader file
 * does what it says on the tin
 */
function initialiseProgram(fragShaderURL, vertShaderURL) {

   /**
    * @param   url            string location of the shader file
    * @param   type           webgl enum defining the shader type (fragment/vertex)
    * @return                 webgl shader (compiled)
    */
   function getShader(url, type) {
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
      
   gl.attachShader(program, getShader(vertShaderURL, gl.VERTEX_SHADER));
   gl.attachShader(program, getShader(fragShaderURL, gl.FRAGMENT_SHADER));
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
   
   program.samplerColorMapsUniform = [
      gl.getUniformLocation(program, 'uSamplerColorMaps[0]'),
      gl.getUniformLocation(program, 'uSamplerColorMaps[1]'),
      gl.getUniformLocation(program, 'uSamplerColorMaps[2]'),
      gl.getUniformLocation(program, 'uSamplerColorMaps[3]'),
      gl.getUniformLocation(program, 'uSamplerColorMaps[4]')];

   program.samplerSpecularMapUniform = gl.getUniformLocation(program, 'uSamplerSpecularMap');
   program.samplerDarkMapUniform = gl.getUniformLocation(program, 'uSamplerDarkMap');

   program.useColorMapsUniform = [
      gl.getUniformLocation(program, 'uUseColorMaps[0]'),
      gl.getUniformLocation(program, 'uUseColorMaps[1]'),
      gl.getUniformLocation(program, 'uUseColorMaps[2]'),
      gl.getUniformLocation(program, 'uUseColorMaps[3]'),
      gl.getUniformLocation(program, 'uUseColorMaps[4]')]; 

   program.useSpecularMapUniform = gl.getUniformLocation(program, 'uUseSpecularMap');
   program.useDarkMapUniform = gl.getUniformLocation(program, 'uUseDarkMap');
   
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
   items = (function genItems(json) {
      var result = [];

      for (var i = 0; i < json.length; i++) {
         var current = json[i];
        
         // instantiating appropriate class
         result[i] = current.type === 'Star' ? 
            new Star(current.radius, genTexPath(current.colorMapURL), current.daysPerYear, 
               genItems(current.satellites)) :
            new Planet(current.radius, genTexPath(current.colorMapURL), 
               genTexPath(current.specularMapURL), current.shininess, 
               genTexPath(current.darkMapURL), current.distance, current.eccentricity, 
               current.orbitAngle, current.orbitOffset, current.velocity, current.daysPerYear, 
               current.axis, (current.rings ? 
                  new Rings(current.rings.size, genTexPath(current.rings.colorMapURL)) : 
                  null), genItems(current.satellites));
      }

      return result;
   })(JSON.parse(request.responseText));
}


/**
 * initialises the background
 */
function initialiseBackground() {

   // https://secure.flickr.com/photos/chrisser/7061523009/
   background = new Cube(BOUNDS * 2, genTexPath(['outerspace.jpg']), null, 0, null, null);
}


/**
 * @param   canvas         canvas element to assign controls to
 */
function initialiseControls(canvas) {
   document.addEventListener('keydown', handleKeyDown, false);
   document.addEventListener('keyup', handleKeyUp, false);
   canvas.addEventListener('mousemove', handleMouse, false);

   /**
    * @param   event          event object describing what's happened
    */
   function handleKeyDown(event) {
      switch (event.keyCode) {
         case 32: // space bar
            PAUSED = !PAUSED;
            break;

         case 67 : // c
            CUBIVERSE = !CUBIVERSE;
            clearInterval(initialiseLoop.handle);
            initialiseItems(DATAPATH + 'solarsystem.json');
            initialiseLoop();  
            break;

         case 79 : // o
            DRAWORBIT = !DRAWORBIT;
            break;

         case 81 : // q
            screenshot();
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

   /**
    * @param   event          event object describing what's happened
    */
   function handleKeyUp(event) {
      switch (event.keyCode) {
         case 37 : case 65 : // left, a
            smoothRotation(false);
            break;

         case 38 : case 87 : // up, w
            smoothMovement(false);
            break;

         case 39 : case 68 : // right, d
            smoothRotation(false);
            break;

         case 40 : case 83 : // down, s
            smoothMovement(false);
            break;
      }
   }

   /**
    * @param   event          event object describing what's happened
    */
   function handleMouse(event) {
      // mouse position between 0 & 1
      var mouse = [event.clientX / canvas.width, event.clientY / canvas.height];

      // allowing for rotation at the edge of the screen
      if (mouse[0] <= 0  && !handleMouse.loop) {
         smoothRotation(true, true);
      } else if (mouse[0] >= 1 && !handleMouse.loop) {
         smoothRotation(true, false);
      } else {
         smoothRotation(false);
      }

      pMove.angleMouse = [Math.PI * (mouse[0] - .5), Math.PI * (mouse[1] - .5)];
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
}


function initialiseLoop() {
   initialiseLoop.handle = setInterval(function tick() {
         requestAnimationFrame(drawScene);
      }, FRAMETIME);
}


////////////////////////////////////////////////////////////////////////////////////////////////////
// drawing


/**
 * assembles & draws the items of the scenr
 */
function drawScene() {
   gl.viewport(0, 0, gl.width, gl.height);
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

   mat4.perspective(pMatrix, 45, gl.width / gl.height, .1, DRAWDISTANCE);

   mat4.rotate(pMatrix, pMatrix, pMove.angleKeyboard[1] + pMove.angleMouse[1], [1, 0, 0]);
   mat4.rotate(pMatrix, pMatrix, pMove.angleKeyboard[0] + pMove.angleMouse[0], [0, 1, 0]);
 
   mat4.translate(pMatrix, pMatrix, pMove.position)

   initialiseLighting();   
   background.draw();

   // basic order of things is - move the origin via a series of matrices, draw, then reset origin
   // drawing is done recursively for anything owned by an item, so only need to draw the list
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
 * @param   fileName       string/array of filename(s)
 * @return                 string/array of filepath(s) or null/empty array
 */
function genTexPath(fileName) {
   if (fileName) {
      var result = [];

      if (typeof fileName === 'string') {
         result = fileName ? TEXTUREPATH + fileName : null;

      } else {
         for (var i = 0; i < fileName.length; i++) {
            result[i] = TEXTUREPATH + fileName[i];
         }
      }
      return result;
   }
}



/**
 * @param   canvas         canvas dom element, optional, if passed will initialise to use this
 */
function screenshot(canvas) {
   if (typeof screenshot.canvas === 'undefined') {
      screenshot.canvas = canvas;
      screenshot.index = 0;

   } else {
      var link = document.createElement('a');
      link.href = screenshot.canvas.toDataURL();
      link.download = 'screenshot-' + (++screenshot.index) + '.png';
      link.click();   
   }
}
