# Contratos inteligentes en JavaScript

En este repositorio se mostrará como crear contratos inteligentes en javascript sobre una blockchain de Fabric. Es necesario contar con fabric y sus prerequisitos instalados y a su vez "node" (en este caso donde se correra el proyecto)

## Librerias que se emplean

* Fabric-shim
* Fabric-shim-api
* util
 
 Para el caso de las dos primeras librerias, se realizara una instalacion local de ambas, para ello en la terminal del computador nos ubicamos en la direccion de la carpeta donde realizaremos el proyecto
Una vez allí realizamos lo siguiente:
```
npm init
```
En ese json se deposita toda la informacion que descibira nuestro proyecto, en especifico de las dependencias. En este caso damos enter y validamos el json. Nos debe aparecer un archivo json en la carpeta llamado package tal como se ejemplifica en el repositorio.

Ahora, importaremos toda la metadata que viene incluida en los paquetes anteriormente mencionados. Esto dentro del anterior json se indentificará como las dependecias de nuestro proyecto.

Para ello escribimos 
```
npm i fabric-shim
```
```
npm i fabric-shim-api
```

Dentro de nuestro json se debió haber creado una nueva llave llamada "dependencies" donde se ven las versiones en las que estamos trabajando los paquetes importados.

## Construccion final del package.json
la llave "license" podemos darle el valor de "UNLICENSED" para no tener problemas con el acceso publico de nuestro proyecto.

## Contratos inteligentes

Dentro de javascript para acceder a los objetos que se crearon dentro del chaincode se recurre constamente a "stub".
Algunos de los metodos que empleamos son:
* stub.getState(): Para llamar elementos de la cadena
* stub.putState(): Colocar objetos en la cadena

Todos los metodos de la clase stub los podemos encontrar en el siguiente link: 
https://hyperledger.github.io/fabric-chaincode-node/master/api/fabric-shim.ChaincodeStub.html


