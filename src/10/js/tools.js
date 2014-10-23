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

