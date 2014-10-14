////////////////////////////////////////////////////////////////////////////////////////////////////
// initialisation



var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var triangleVertexPositionBuffer;
var squareVertexPositionBuffer;



window.onload = function initialise() {
   var can = document.getElementById('can');

   gl = initialiseGL(can);
   shaderProgram = initialiseShaders(gl);

   var items = initialiseItems([new Item([
        0,   1,   0,
       -1,  -1,   0,
        1,  -1,   0
   ]), new Item([
        1,   1,   0,
       -1,   1,   0,
        1,  -1,   0,
       -1,  -1,   0
   ])]);
 
   
   gl.clearColor(0.0, 0.0, 0.0, 1.0);
   gl.enable(gl.DEPTH_TEST);

   drawScene(gl, shaderProgram, items);
}



/**
 * @param   can            canvas dom object
 * @return                 webgl context object
 */
function initialiseGL(can) {
   var gl;

   try {
      gl = can.getContext('experimental-webgl');
      var dim = getViewportDimensions();

      can.width = dim.w;
      can.height = dim.h;
      gl.width = dim.w;
      gl.height = dim.h;

   } catch (exeception) {
      console.error('could not initialise webgl');

   } finally {
      return gl;
   }
}



/**
 * @param   gl             webgl context object
 */
function initialiseShaders(gl) {
   var fragmentShader = getShader(gl, 'shader-fs'),
       vertexShader = getShader(gl, 'shader-vs'),
       shaderProgram = gl.createProgram();

   gl.attachShader(shaderProgram, vertexShader);
   gl.attachShader(shaderProgram, fragmentShader);
   gl.linkProgram(shaderProgram);

   if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.error('could not initialise shaders');
   }

   gl.useProgram(shaderProgram);

   shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
   gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

   shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, 'uPMatrix');
   shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, 'uMVMatrix');

   return shaderProgram;
}






function initialiseItems(items) {
   return items;
}


/**
 * @param   gl             webgl context object
 * @param   shaderProgram  shader program object
 * @param   items          array of item objects to draw
 */
function drawScene(gl, shaderProgram, items) {
   gl.viewport(0, 0, gl.width, gl.height);
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

   mat4.perspective(pMatrix, 90, gl.width / gl.height, 0.1, 100.0);

   mat4.identity(mvMatrix);

 
   mat4.translate(mvMatrix, mvMatrix,[-1.5, 0.0, -7.0]);
   items[0].draw(gl, shaderProgram);

   mat4.translate(mvMatrix, mvMatrix, [3.0, 0.0, 0.0]);
   items[1].draw(gl, shaderProgram);
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// items class


/**
 * @param   vertices       array of vertex descriptions
 * @param   vertexLength   (optional, defaults to 3) length of vertex description
 *
 */
function Item(vertices, vertexLength) {

   if (typeof vertexLength == 'undefined') {
      vertexLength = 3;
   }

   this.vertices = new Float32Array(vertices);
   this.vertexCount = vertices.length / vertexLength;
   this.vertexLength = vertexLength;
}


/**
 * @param   gl             webgl context object
 * @return                 webgl buffer of the instance called upon
 */
Item.prototype.buffer = function(gl) {
   var buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
   buffer.vertexCount = this.vertexCount;
   buffer.vertexLength = this.vertexLength;

   return buffer;
}


/**
 * @param   gl             webgl context object
 * @param   shaderProgram  shader program
 */
Item.prototype.draw = function(gl, shaderProgram) {
   var buffer = this.buffer(gl);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, buffer.vertexLength, gl.FLOAT, false, 0, 0);
   setMatrixUniforms(gl, shaderProgram);
   gl.drawArrays(gl.TRIANGLE_STRIP, 0, buffer.vertexCount);
}



////////////////////////////////////////////////////////////////////////////////////////////////////
// tools


function setMatrixUniforms(gl, shaderProgram) {
   gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
   gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}



/**
 * @param   gl             webgl context object
 * @param   id             id of dom object containing shader
 * @return                 shader program
 */
function getShader(gl, id) {
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

