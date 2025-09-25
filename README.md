# TourneyJS

TourneyJS: Analizador Léxico para Gestión de Torneos Deportivos

# Propuesta 

Desarrollar una herramienta de análisis léxico en JavaScript que permita interpretar archivos de texto que describan un torneo deportivo basado en equipos, jugadores y resultados de partidos. La aplicación deberá realizar un análisis léxico del archivo de entrada, extraer los tokens correspondientes y generar dos tipos de salida. 

1. Un reporte HTML con las tablas de posiciones finales, estadísticas individuales y de equipos, ordenadas según el sistema de puntuación del torneo. 
2. Diagrama de brackets de eliminación en formato gráfico, genereados con Graphviz, representando visualmente la estructura del torneo y el avance de los equipos. 

El sistema contará con una interfaz web que permitirá a los usuarios cargar archivos, visualizar el análisis léxico, generar las salidas y exportarlas. 

![alt text](/imagenes/image.png)

# Estructura del lenguaje 

El archivo de entrada sigue una estructura jerárquica donde los elementos principales son: 

1. __TORNEO__: Sección donde se define la información general del torneo de eliminación. 

2. __EQUIPOS__: Sección donde se definen todos los equipos participantes y sus jugadores.

3. __ELIMINACIÓN__: Sección donde se definen los partidos del torneo de eliminación directa organizados por fases. 


Reglas de Sintaxis del Lenguaje
![alt text](/imagenes/image-1.png)

# Sección de Errores Léxico
Cuando se detectan errores en la sintaxis del archivo de entrada, estos deben reportarse en una tabla HTML. 
![alt text](/imagenes/image-2.png)

## Formato de la Tabla de Errores
Cada error léxico debe contener la siguiente información:

* __Número del error__: Identificador del error en la lista. 
* __Descripción__: Breve explicación del error
* __Línea y columna__: Ubicación exacta del error en el archivo de entrada. 

# Sección de Tokens

Cuando el código de entrada es válido, el analizador debe extraer y mostrar los tokens reconocidos en una tabla HTML. Estos tokens representan los elementos válidos del lenguaje. 

## Formato de la Tabla de Tokens 

![alt text](/imagenes/image-3.png)

# Reportes Generados por el Sistema 
El sistema debe generar automáticamente cuatro reportes principales que aprovechen toda la información procesada, estos reportes deben realizarse en uno o varios reportes individuales, a discreción del estudiante, en formato HTML

## Reportes de Bracket de Eliminación 

Muestra el avance de todos los equipos a través de las fases del torneo, incluyendo resultados y próximos enfrentramientos. 

![alt text](/imagenes/image-4.png)

## Reporte de Estadísticas por Equipo

Análisis detallado del desempeño de cada equipo en el torneo. 

* J: Partidos Jugados
* G: Partidos Ganados
* P: Partidos Perdidos
* GF: Goles a Favor
* GC: Goles en Contra

![alt text](/imagenes/image-5.png)


## Reporte de Goleadores
Ranking de los jugadores que más goles han anotado en el torneo 

![alt text](/imagenes/image-6.png)

## Reporte de Información General del Torneo. 

Resumen completo con datos estadísticos del torneo.

![alt text](/imagenes/image-7.png)

# Ejemplo código de entrada
![alt text](/imagenes/image-8.png)

# Graphviz

![alt text](/imagenes/image-9.png)
