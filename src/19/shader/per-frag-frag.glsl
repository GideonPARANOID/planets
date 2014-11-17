precision mediump float;

varying vec2 vTextureCoord;
varying vec3 vTransformedNormal;
varying vec4 vPosition;

uniform float uMaterialShininess;

uniform bool uUseColorMaps[5],
   uUseSpecularMap,
   uUseDarkMap;

uniform vec3 uAmbientColor, 
   uPointLightingLocation,
   uPointLightingSpecularColor,
   uPointLightingDiffuseColor,
   uMaterialEmissiveColor;

uniform sampler2D uSamplerColorMaps[5], 
   uSamplerSpecularMap,
   uSamplerDarkMap;

void main(void) {
   vec3 lightWeighting, 
      lightDirection = normalize(uPointLightingLocation - vPosition.xyz),
      normal = normalize(vTransformedNormal);

   float diffuseLightWeighting = max(dot(normal, lightDirection), 0.0), 
      specularLightWeighting = 0.0, 
      specularMap = 32.0;
    
   // sampling the specular map for the shininess of a point
   if (uUseSpecularMap) {
      specularMap = texture2D(uSamplerSpecularMap, vec2(vTextureCoord.x, vTextureCoord.y)).r * 255.0;
   }

   // avoiding specular highlights on both sides of an object
   if (diffuseLightWeighting > 0.0) {
      vec3 eyeDirection = normalize(-vPosition.xyz),
         reflectionDirection = reflect(-lightDirection, normal);

      if (specularMap < 200.0) {
         specularLightWeighting = 
            pow(max(dot(reflectionDirection, eyeDirection), 0.0), uMaterialShininess);
      }
   }

   lightWeighting = uAmbientColor +
      (uPointLightingSpecularColor * specularLightWeighting) +
      (uPointLightingDiffuseColor * diffuseLightWeighting);

   // averaging the available colormaps
   vec4 sum = vec4(0.0, 0.0, 0.0, 0.0);
   float samplerCount = 0.0;

   for (int i = 0; i < 5; i++) {
      if (uUseColorMaps[i]) {
         samplerCount++;
         sum += texture2D(uSamplerColorMaps[i], vec2(vTextureCoord.x, vTextureCoord.y));
      }
   }
   
   vec4 colorMap = sum / samplerCount;

   // if we're using a dark map, fraction parts of color & dark maps based on diffuse
   if (uUseDarkMap) {
      vec4 darkColor = texture2D(uSamplerDarkMap, vec2(vTextureCoord.x, vTextureCoord.y));
  
      gl_FragColor = vec4((((1.0 - lightWeighting) + uMaterialEmissiveColor) * darkColor.rgb) +
         ((lightWeighting + uMaterialEmissiveColor) * colorMap.rgb), colorMap.a);

   } else {
      gl_FragColor = 
         vec4(colorMap.rgb * lightWeighting + uMaterialEmissiveColor, colorMap.a);
   } 
}

