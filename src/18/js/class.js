/**
 * @author (gij2) gideon mw jones
 * @created 2014-10-25
 */

'use strict';


/**
 * rudimentary class for creating drawable items & drawing them in webgl, constructs the item as a 
 *    series of elements & positions them using the animation parameter
 *
 * @param   vertices       array of numbers as vertex descriptions ([x1, y1, z1, x2, y2, z2])
 * @param   vertexIndices  array of numbers as indices in the vertices describing elements
 * @param   normals        array of numbers as element normals
 * @param   textureCoord   array of numbers as indices in the vertices describing texture coords
 * @param   colorMapURLs   array of string paths to texture images
 * @param   specularMapURL string path to the specular map texture, can be null,
 * @param   shininess      number for the specular shininess (defaults to 5)
 * @param   animation      function moving the item's position for drawing, can be used to animate
 * @param   lighting       function to set up any lighting parameters specifically for this item
 */
function ItemElements(vertices, vertexIndices, normals, textureCoord, colorMapURLs, specularMapURL,
   shininess, animation, lighting) {

   this.vertices = new Float32Array(vertices);
   
   this.vertexIndices = new Uint16Array(vertexIndices);   
   
   this.normals = new Float32Array(normals);

   this.colorMaps = [];

   /**
    * @param   _this          object of ItemElements
    * @param   i              number index of colorMapURL
    * asynchronous recursive function which generates & loads textures for colour maps
    * as to maths what the chapman brothers are to goya
    */
   (function genTexture(_this, i) {
      _this.colorMaps[i] = gl.createTexture();
      _this.colorMaps[i].image = new Image();
      _this.colorMaps[i].image.src = colorMapURLs[i];

      // finishing initialisation after loading resource
      _this.colorMaps[i].image.onload = function loadTexture() {
         gl.bindTexture(gl.TEXTURE_2D, _this.colorMaps[i]);
         gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
         gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, _this.colorMaps[i].image);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
         gl.generateMipmap(gl.TEXTURE_2D);
         gl.bindTexture(gl.TEXTURE_2D, null);

         if (++i < colorMapURLs.length) {
            genTexture(_this, i);
         }
      }
   })(this, 0);

   this.textureCoord = new Float32Array(textureCoord);

   if (specularMapURL) {
      this.specularMap = gl.createTexture();
      this.specularMap.image = new Image();
      this.specularMap.image.src = specularMapURL;

      var _specularMap = this.specularMap;

      this.specularMap.image.onload = function() {
         gl.bindTexture(gl.TEXTURE_2D, _specularMap);
         gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
         gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, _specularMap.image);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
         gl.generateMipmap(gl.TEXTURE_2D);
         gl.bindTexture(gl.TEXTURE_2D, null);
      }
   }

   this.shininess = shininess;

   // in case there's no animation or lighting functions, fixes typeerrors, faster to check once
   this.animation = animation ? animation : function() {};
   this.lighting = lighting ? lighting : function() {};

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
   gl.uniform1i(program.useSpecularMapUniform, this.specularMap ? true : false);
   gl.uniform1f(program.materialShininessUniform, this.shininess);
   this.animation();

   gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferVertices);
   gl.vertexAttribPointer(program.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufferVertexIndices);

   gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferNormals);
   gl.vertexAttribPointer(program.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
   
   gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferTextureCoord);
   gl.vertexAttribPointer(program.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

   var i = 0;
   for (; i < this.colorMaps.length; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, this.colorMaps[i]);
   }

   if (this.specularMap) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, this.specularMap);
   }

   setMatrixUniforms();
   gl.drawElements(gl.TRIANGLES, this.vertexIndices.length, gl.UNSIGNED_SHORT, 0);
}


////////////////////////////////////////////////////////////////////////////////////////////////////
// shapes


/**
 * creates a sphere centring on the origin
 * @super   ItemElements
 * @param   radius         number radius of the circle to create
 * @param   colorMapURLs   @see ItemElements
 * @param   specularMapURL @see ItemElements
 * @param   shininess      @see ItemElements
 * @param   animation      @see ItemElements
 * @param   lighting       @see ItemElements
 */
function Sphere(radius, colorMapURLs, specularMapURL, shininess, animation, lighting) {
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

   ItemElements.call(this, vertices, vertexIndices, normals, textureCoord, colorMapURLs, 
      specularMapURL, shininess, animation, lighting);
}

Sphere.prototype = Object.create(ItemElements.prototype);
Sphere.prototype.constructor = Sphere; 


/**
 * creates a cube centring on the origin
 * @super   ItemElements
 * @param   size           number length of the sides of the cube
 * @param   colorMapURLs   @see ItemElements
 * @param   specularMapURL @see ItemElements
 * @param   shininess      @see ItemElements
 * @param   animation      @see ItemElements
 * @param   lighting       @see ItemElements
 */
function Cube(size, colorMapURLs, specularMapURL, shininess, animation, lighting) {
   var s = size / 2;

   ItemElements.call(this, [ // vertices
        -s, -s,  s,     s, -s,  s,     s,  s,  s,    -s,  s,  s,
        -s, -s, -s,    -s,  s, -s,     s,  s, -s,     s, -s, -s,
        -s,  s, -s,    -s,  s,  s,     s,  s,  s,     s,  s, -s,
        -s, -s, -s,     s, -s, -s,     s, -s,  s,    -s, -s,  s,
         s, -s, -s,     s,  s, -s,     s,  s,  s,     s, -s,  s,
        -s, -s, -s,    -s, -s,  s,    -s,  s,  s,    -s,  s, -s
      ], [ //  vertex indices
         0,  1,  2,  0,  2,  3, 
         4,  5,  6,  4,  6,  7, 
         8,  9, 10,  8, 10, 11, 
        12, 13, 14, 12, 14, 15,
        16, 17, 18, 16, 18, 19, 
        20, 21, 22, 20, 22, 23  
      ], [ // normals
         0,  0,  1,     0,  0,  1,     0,  0,  1,     0,  0,  1,
         0,  0, -1,     0,  0, -1,     0,  0, -1,     0,  0, -1,
         0,  1,  0,     0,  1,  0,     0,  1,  0,     0,  1,  0,
         0, -1,  0,     0, -1,  0,     0, -1,  0,     0, -1,  0,
         1,  0,  0,     1,  0,  0,     1,  0,  0,     1,  0,  0,
        -1,  0,  0,    -1,  0,  0,    -1,  0,  0,    -1,  0,  0,
      ], [ // texture coords
         0,  0,         1,  0,         1,  1,         0,  1,
         1,  0,         1,  1,         0,  1,         0,  0,
         0,  1,         0,  0,         1,  0,         1,  1,
         1,  1,         0,  1,         0,  0,         1,  0,
         1,  0,         1,  1,         0,  1,         0,  0,
         0,  0,         1,  0,         1,  1,         0,  1
      ], colorMapURLs, specularMapURL, shininess, animation, lighting);
}

Cube.prototype = Object.create(ItemElements.prototype);
Cube.prototype.constructor = Cube;


////////////////////////////////////////////////////////////////////////////////////////////////////
// celestial stuff


/**
 * @super   ItemElements
 * @param   size           number diameter
 * @param   colorMapURLs   @see ItemElements
 */
function Rings(size, colorMapURLs) {
   var s = size / 2;

   ItemElements.call(this, [ // vertices
        -s,  0, -s,    -s,  0,  s,     s,  0,  s,     s,  0, -s,
        -s,  0, -s,     s,  0, -s,     s,  0,  s,    -s,  0,  s,
      ], [ //  vertex indices
         0,  1,  2,  0,  2,  3, 
         4,  5,  6,  4,  6,  7, 
      ], [ // normals
         0,  1,  0,     0,  1,  0,     0,  1,  0,     0,  1,  0,
         0, -1,  0,     0, -1,  0,     0, -1,  0,     0, -1,  0,
      ], [ // texture coords
         0,  1,         0,  0,         1,  0,         1,  1,
         1,  1,         0,  1,         0,  0,         1,  0,
      ], colorMapURLs, null, 5, function animation() {
         if (typeof this.animation.day === 'undefined') {
            this.animation.day = 0;
         }

         if (!paused) {
            this.animation.day += 100 * .001;
         }

         mat4.rotate(mvMatrix, mvMatrix, this.axis, [1, 0, 0]);
         mat4.rotate(mvMatrix, mvMatrix, this.animation.day, [0, 1, 0]);

      }, null);  
}

Rings.prototype = Object.create(ItemElements.prototype);
Rings.prototype.constructor = Rings;


Rings.prototype.draw = function() {

   // setting the array of used textures
   for (var i = 0; i < 5; i++) {
      gl.uniform1i(program.useColorMapsUniform[i], i < this.colorMaps.length);
   }

   gl.uniform1i(program.useSpecularMapUniform, this.specularMap ? true : false);
   gl.uniform1f(program.materialShininessUniform, this.shininess);
   this.animation();

   gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferVertices);
   gl.vertexAttribPointer(program.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufferVertexIndices);

   gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferNormals);
   gl.vertexAttribPointer(program.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
   
   gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferTextureCoord);
   gl.vertexAttribPointer(program.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

   for (var i = 0; i < this.colorMaps.length; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, this.colorMaps[i]);
   }

   // rings use alpha
   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE);      

   setMatrixUniforms();
   gl.drawElements(gl.TRIANGLES, this.vertexIndices.length, gl.UNSIGNED_SHORT, 0);

   gl.disable(gl.BLEND);
}


/**
 * @super   Sphere 
 * @param   radius         @see Sphere
 * @param   colorMapURLs   @see ItemElements
 * @param   specularMapURL @see itemElements
 * @param   daysPerYear    number speed the star spins at (arbitrary)
 * @param   satellites     array of Planets 'owned' by a star
 */
function Star(radius, colorMapURLs, daysPerYear, satellites) {
   this.satellites = satellites;
   
   (CUBIVERSE ? Cube : Sphere).call(this, radius, colorMapURLs, null, 10, function animation() {
         if (typeof this.animation.day === 'undefined') {
            this.animation.day = 0;
         }
    
         if (!paused) {
            this.animation.day += daysPerYear / FRAMETIME;
         }

         mvMatrixPush();
   
         mat4.rotate(mvMatrix, mvMatrix, this.animation.day, [0, 1, 0]);

      }, function lighting() {
         gl.uniform3f(program.materialEmissiveColorUniform, .9, .9, .9);
      });
}

Star.prototype = Object.create(Sphere.prototype);
Star.prototype.constructor = Star;


/**
 * @super   Sphere 
 * @param   radius         @see Sphere
 * @param   colorMapURL    @see ItemElements
 * @param   specularMapURL @see ItemElements
 * @param   shininess      @see ItemElements
 * @param   darkMapURL     string path of a texture to use for the side of the planet in shadow
 * @param   distance       number as the distance from the star/planet it is 'owned' by
 * @param   eccentricity   number describing the eccentricity of the orbit (circle is 0)
 * @param   orbitAngle     number radians how much for the orbit to vary vertically
 * @param   orbitOffset    number radians how much to offset sync the orbit
 * @param   velocity       number speed the planet travels at (arbitrary)
 * @param   daysPerYear    number of days in that year
 * @param   axis           number radians angle for the planet to spin at
 * @param   rings          @see Rings
 * @param   satellites     array of Planets 'owned' by a planet
 */
function Planet(radius, colorMapURLs, specularMapURL, shininess, darkMapURL, distance, 
   eccentricity, orbitAngle, orbitOffset, velocity, daysPerYear, axis, rings, satellites) {
  
   velocity /= 10000;   
      
   if (rings) {
      this.rings = rings;
      this.rings.axis = axis;
   }
   
   this.satellites = satellites;  

   if (darkMapURL) {
      this.darkMap = gl.createTexture();
      this.darkMap.image = new Image();
      this.darkMap.image.src = darkMapURL;

      var _darkMap = this.darkMap;

      this.darkMap.image.onload = function() {
         gl.bindTexture(gl.TEXTURE_2D, _darkMap);
         gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
         gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, _darkMap.image);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
         gl.generateMipmap(gl.TEXTURE_2D);
         gl.bindTexture(gl.TEXTURE_2D, null);
      }
   }
   
   (CUBIVERSE ? Cube : Sphere).call(this, radius, colorMapURLs, specularMapURL, shininess,
      function animation() {
         
         if (typeof this.animation.year === 'undefined') {
            this.animation.day = 0;
            this.animation.year = orbitOffset;
            this.animation.currentDistance = distance;
         }

         if (!paused) { 

            // kepler's first law
            this.animation.currentDistance = 
               (distance * (1 + eccentricity)) / 
               (1 + (eccentricity * Math.cos(this.animation.year)));

            // kepler's second law
            this.animation.year += (FRAMETIME * distance * distance * velocity) /
               (this.animation.currentDistance * this.animation.currentDistance);               

            // spinning
            this.animation.day = (this.animation.year % (2 * Math.PI)) * daysPerYear;
         } 

         mat4.translate(mvMatrix, mvMatrix, [
            this.animation.currentDistance * Math.sin(this.animation.year), 
            Math.sin(orbitAngle) * this.animation.currentDistance * 
               Math.sin(this.animation.year + orbitOffset % (2 * Math.PI)),
            this.animation.currentDistance * Math.cos(this.animation.year)]);

         // we wouldn't want the spinning of the planet to influence any satellites
         // popped off when drawing satellites
         mvMatrixPush();

         // spin axis orientation
         mat4.rotate(mvMatrix, mvMatrix, axis, [1, 0, 0]);
         mat4.rotate(mvMatrix, mvMatrix, -this.animation.day, [0, 1, 0]);

      }, function lighting() {
         gl.uniform3f(program.materialEmissiveColorUniform, 0, 0, 0);         
         gl.uniform1f(program.materialShininessUniform, 5);  
      });
}

Planet.prototype = Object.create(Sphere.prototype);
Planet.prototype.constructor = Planet;


/**
 * no point adding another layer of inheritance just to stick this in
 * stars & planets share the ability to have rings/satellites, draws them recursively
 */
Planet.prototype.draw = Star.prototype.draw = function() {
   this.lighting();

   // setting the array of used textures
   for (var i = 0; i < 5; i++) {
      gl.uniform1i(program.useColorMapsUniform[i], i < this.colorMaps.length);
   }

   gl.uniform1i(program.useSpecularMapUniform, this.specularMap ? true : false);
   gl.uniform1i(program.useDarkMapUniform, this.darkMap ? true : false);
   gl.uniform1f(program.materialShininessUniform, this.shininess);

   this.animation();

   gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferVertices);
   gl.vertexAttribPointer(program.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufferVertexIndices);

   gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferNormals);
   gl.vertexAttribPointer(program.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
   
   gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferTextureCoord);
   gl.vertexAttribPointer(program.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

   var i = 0;
   for (; i< this.colorMaps.length; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, this.colorMaps[i]);
      gl.uniform1i(program.samplerColorMapsUniform[i], i);
   }
   
   if (this.specularMap) {
      i++;
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, this.specularMap);
      gl.uniform1i(program.samplerSpecularMapUniform, i);
   }

   if (this.darkMap) {
      i++;
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, this.darkMap);    
      gl.uniform1i(program.samplerDarkMapUniform, i);
   }

   setMatrixUniforms();
   gl.drawElements(gl.TRIANGLES, this.vertexIndices.length, gl.UNSIGNED_SHORT, 0);

   // removing the star's/planet's spin
   mvMatrixPop();

   if (this.rings) {
      mvMatrixPush();
      this.rings.draw();  
      mvMatrixPop();
   }

   for (var i = 0; i < this.satellites.length; i++) {
      mvMatrixPush();
      this.satellites[i].draw();
      mvMatrixPop();
   }
}

