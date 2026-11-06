# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

Personas que empiezan a dibujar y quieren resultados rápidos, aficionados que hacen murales o láminas
grandes y creadores que comparten su proceso en redes (docs/PRD.md). La escena típica es un móvil
sujeto sobre un folio, a menudo de noche con un flexo, con el lápiz en una mano: se toca poco y con
prisa, y la vista va al papel, no a la pantalla.

## Product Purpose

Calcar una imagen con la cámara del móvil (y prepararla o proyectarla desde el PC, fase 2), sin anuncios.
Éxito: terminar un dibujo real, también uno grande de varios folios, solo con la app. Primer objetivo,
una pieza de portfolio publicada en tiendas; después, si hay tracción, pago único o premium, nunca
anuncios.

## Positioning

Las apps de AR drawing populares viven de anuncios, se desalinean al mínimo movimiento, no bloquean
los toques accidentales y no ayudan con dibujos que no caben en un folio. AR-Darwin: cero anuncios,
control preciso de la imagen (modo imán, ajuste fino, candado) y divisor en trozos con corte al ras o
bordes extendidos, con progreso por trozo.

## Operating Context

- Biblioteca local de proyectos (SQLite + archivos del dispositivo), sin cuenta hasta la fase 3.
- Importar desde galería o cámara del sistema; desde Archivos y «Compartir» tras el rebuild nativo.
- Flujo: importar, dividir (opcional), calcar trozo a trozo en la cámara, marcar trozos hechos.

## Capabilities and Constraints

- Expo (development build) con vision-camera, Skia y Reanimated; lógica pura en packages/core.
- Español e inglés desde el primer día; textos solo desde packages/i18n.
- Abierto: iOS (fase 4), Retos, time-lapse, foto a boceto y PC (fase 2).

## Brand Commitments

- Nombre AR-Darwin; logotipo, el árbol «I think» del cuaderno de Darwin (1837) con el origen «1» en bermellón.
- Sin anuncios, nunca.

## Evidence on Hand

No hay testimonios, usuarios, métricas ni prensa: no inventarlos.

## Product Principles

- La interfaz no estorba mientras dibujas.
- Precisión antes que efectos.
- Los dibujos grandes son de primera clase: trozo, progreso y siguiente paso siempre a mano.
- Lo que se hace en local es del usuario: nada se borra sin poder deshacerlo o confirmarlo.

## Accessibility & Inclusion

- Objetivos táctiles de 48 dp como mínimo (se usa con un lápiz en la mano).
- Contraste AA, etiquetas en botones de icono, TalkBack.
- Respetar «reducir movimiento» del sistema.
