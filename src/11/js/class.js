
/**
 * rudimentary class for creating drawable items & drawing them in webgl, constructs the item as a 
 *    series of elements & positions them using the animation parameter
 *
 * @param   vertices       array of numbers as vertex descriptions ([x1, y1, z1, x2, y2, z2])
 * @param   vertexIndices  array of numbers as indices in the vertices describing elements
 * @param   normals        array of numbers as element normals
 * @param   textureURL     string path to the texture image
 * @param   textureCoord   array of numbers as indices in the vertices describing texture coords
 * @param   animation      function moving the item's position for drawing, can be used to animate
 */
function ItemElements(vertices, vertexIndices, normals, textureURL, textureCoord, animation) {
   this.vertices = new Float32Array(vertices);
   
   this.vertexIndices = new Uint16Array(vertexIndices);   
   
   this.normals = new Float32Array(normals);

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

   this.animation = animation;

   this.bufferVertices = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferVertices);
   gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
   
   this.bufferVertexIndices = gl.createBuffer();
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufferVertexIndices);
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndices, gl.STATIC_DRAW);

   this.bufferNormals = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferNormals);
   gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);

   this.bufferTextureCoord = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferTextureCoord);
   gl.bufferData(gl.ARRAY_BUFFER, this.textureCoord, gl.STATIC_DRAW);
}


ItemElements.prototype.draw = function() {
   this.lighting();
   this.animation();

   gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferVertices);
   gl.vertexAttribPointer(program.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufferVertexIndices);

   gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferNormals);
   gl.vertexAttribPointer(program.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
   
   gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferTextureCoord);
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
 * @param   radius         number radius of the circle to create
 * @param   textureURL     @see ItemElements
 * @param   animation      @see ItemElements
 */
function Sphere(radius, textureURL, animation) {
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


////////////////////////////////////////////////////////////////////////////////////////////////////
// celesial stuff


/**
 * @super   Sphere 
 * @param   radius         @see Sphere
 * @param   textureURL     @see ItemElements
 * @param   yearLength     number length of time for the planet to orbit origin (arbitrary)
 * @param   satellites     array of Planets 'owned' by a star
 */
function Star(radius, textureURL, daysPerYear, satellites) {
   this.satellites = satellites;

   this.lighting = function() {
      gl.uniform3f(program.ambientColorUniform, .9, .9, .9);  

      gl.uniform1i(program.samplerUniform, 0);
      gl.uniform1f(program.materialShininessUniform, 5);
   }

   Sphere.call(this, radius, textureURL, function animation() {
         if (typeof this.animation.year === 'undefined') {
            this.animation.day = 0;
         }
    
         if (!paused) {
            this.animation.day += daysPerYear * .001;
         }

         mvMatrixPush();
         mat4.rotate(mvMatrix, mvMatrix, this.animation.day, [0, 1, 0]);
         mvMatrixPop();
      });
}

Star.prototype = Object.create(Sphere.prototype);
Star.prototype.constructor = Star;


/**
 * @super   Sphere 
 * @param   radius         @see Sphere
 * @param   textureURL     @see ItemElements
 * @param   distance       number as the distance from the star/planet it is 'owned' by
 * @param   eccentricity   number describing the eccentricity of the orbit (circle is 0)
 * @param   yearLength     number length of time for the planet to orbit origin (arbitrary)
 * @param   satellites     array of Planets 'owned' by a planet
 */
function Planet(radius, textureURL, distance, eccentricity, yearLength, daysPerYear, satellites) {

   this.lighting = function() {
      gl.uniform3f(program.ambientColorUniform, .1, .1, .1);  
     
      gl.uniform1i(program.samplerUniform, 0);
      gl.uniform1f(program.materialShininessUniform, 5);
   }  
   
   this.satellites = satellites;

   Sphere.call(this, radius, textureURL, function animation() {
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

      }, false);
}

Planet.prototype = Object.create(Sphere.prototype);
Planet.prototype.constructor = Planet;


/**
 * no point adding another layer of inheritance just to stick this in
 * stars & planets share the ability to have satellites, draws them recursively
 */
Planet.prototype.draw = Star.prototype.draw = function() {

   // initial drawing setup
   this.lighting();
   this.animation();

   gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferVertices);
   gl.vertexAttribPointer(program.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufferVertexIndices);

   gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferNormals);
   gl.vertexAttribPointer(program.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
   
   gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferTextureCoord);
   gl.vertexAttribPointer(program.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, this.texture);

   setMatrixUniforms();
   gl.drawElements(gl.TRIANGLES, this.vertexIndices.length, gl.UNSIGNED_SHORT, 0);

   for (var i = 0; i < this.satellites.length; i++) {
      mvMatrixPush();
      this.satellites[i].draw();
      mvMatrixPop();
   }
}

