# Imágenes de prueba (spike de cámara, issue #17)

Solo para desarrollo: alternadas en `/dev/camera` para probar el Canvas de Skia sobre la
cámara. No se incluyen en ninguna pantalla de producción.

## calibration.png

Generada por `apps/mobile/scripts/generate-calibration.mjs` (sin dependencias). 3072×4096 px
(4096 en el lado largo: el máximo que la app aceptará al importar una foto, ver docs/PRD.md).
Cuadrícula de 64 px con línea mayor cada 512, cruz central y marcas en las esquinas: sirve para
ver a simple vista si la imagen se mueve, rota o pierde nitidez.

## darwin-i-think.png

«I think», cuaderno B de Charles Darwin, 1837. Dominio público (publicado antes de 1931;
marcado en Wikimedia Commons como libre de restricciones de copyright conocidas).

- Fuente: https://commons.wikimedia.org/wiki/File:Darwin_Tree_1837.png
- Descarga directa: https://upload.wikimedia.org/wikipedia/commons/1/10/Darwin_Tree_1837.png
- Autor: Charles Darwin (1809–1882)
- Tamaño: 1390×2265 px (sin redimensionar, ya por debajo del máximo de 4096)
