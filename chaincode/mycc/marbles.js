/*
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
*/

// ====CHAINCODE EXECUTION SAMPLES (CLI) ==================

// ==== Invoke marbles ====
// peer chaincode invoke -C myc1 -n marbles -c '{"Args":["initMarble","marble1","blue","35","tom"]}'
// peer chaincode invoke -C myc1 -n marbles -c '{"Args":["initMarble","marble2","red","50","tom"]}'
// peer chaincode invoke -C myc1 -n marbles -c '{"Args":["initMarble","marble3","blue","70","tom"]}'
// peer chaincode invoke -C myc1 -n marbles -c '{"Args":["transferMarble","marble2","jerry"]}'
// peer chaincode invoke -C myc1 -n marbles -c '{"Args":["transferMarblesBasedOnColor","blue","jerry"]}'
// peer chaincode invoke -C myc1 -n marbles -c '{"Args":["delete","marble1"]}'

// ==== Query marbles ====
// peer chaincode query -C myc1 -n marbles -c '{"Args":["readMarble","marble1"]}'
// peer chaincode query -C myc1 -n marbles -c '{"Args":["getMarblesByRange","marble1","marble3"]}'
// peer chaincode query -C myc1 -n marbles -c '{"Args":["getHistoryForMarble","marble1"]}'
// peer chaincode query -C myc1 -n marbles -c '{"Args":["getMarblesByRangeWithPagination","marble1","marble3","3",""]}'

// Rich Query (Only supported if CouchDB is used as state database):
// peer chaincode query -C myc1 -n marbles -c '{"Args":["queryMarblesByOwner","tom"]}'
// peer chaincode query -C myc1 -n marbles -c '{"Args":["queryMarbles","{\"selector\":{\"owner\":\"tom\"}}"]}'

// Rich Query with Pagination (Only supported if CouchDB is used as state database):
// peer chaincode query -C myc1 -n marbles -c '{"Args":["queryMarblesWithPagination","{\"selector\":{\"owner\":\"tom\"}}","3",""]}'


'use strict';
// npm install --save fabric-shim
const shim = require('fabric-shim');
// npm install --save util
const util = require('util');


/*
Dento del codigo cada vez que veamos la palabra stub hacemos referencia al api que permite la comunicacion que existe
entre fabric y el archivo js
*/

// Se crea el objeto chaincode
let Chaincode = class {
  // Creamos una promesas dentro de las clases
  async Init(stub) {
    let ret = stub.getFunctionAndParameters();
    // imprimimos la informacion de que se inicializo correctamente la cadena de bloques
    console.info(ret);
    console.info('=========== Instantiated Marbles Chaincode ===========');
    return shim.success();
  }
  // Creamos el metodo Invoke
  async Invoke(stub) {
    // Obtenemos el numero de transaccion
    console.info('Transaction ID: ' + stub.getTxID());
    console.info(util.format('Args: %j', stub.getArgs()));

    let ret = stub.getFunctionAndParameters();
    console.info(ret);

    let method = this[ret.fcn];
    if (!method) {
      console.log('no function of name:' + ret.fcn + ' found');
      throw new Error('Received unknown function ' + ret.fcn + ' invocation');
    }
    try {
      let payload = await method(stub, ret.params, this);
      return shim.success(payload);
    } catch (err) {
      console.log(err);
      return shim.error(err);
    }
  }

  // ===============================================
  // initMarble - create a new marble
  // ===============================================
  // Creacion del objeto canica
  async initMarble(stub, args, thisClass) {
    /*
    Parametros:
    1- Id de la canica
    2- color
    3- size
    4- Propietario
    */
    // La canica requiere de 4 parametros
    if (args.length != 4) {
      throw new Error('Incorrect number of arguments. Expecting 4');
    }
    // imprimimos la creacion de la canica
    console.info('--- start init marble ---')
    // Primer elemento requiere un string de una longitud distinta de cero, lo mismo con los demas argumentos
    if (args[0].lenth <= 0) {
      throw new Error('1st argument must be a non-empty string');
    }
    if (args[1].lenth <= 0) {
      throw new Error('2nd argument must be a non-empty string');
    }
    if (args[2].lenth <= 0) {
      throw new Error('3rd argument must be a non-empty string');
    }
    if (args[3].lenth <= 0) {
      throw new Error('4th argument must be a non-empty string');
    }

    let marbleName = args[0];
    // Metodo tolowercase vuelve minusculas todas las letras del string
    let color = args[1].toLowerCase();
    let owner = args[3].toLowerCase();
    // Como se ingresa como string es necesario hacer un cast a entero
    let size = parseInt(args[2]);
    // El parse debe ser capaz de identificar que el string ingresado era un numero sino envia un error
    if (typeof size !== 'number') {
      throw new Error('3rd argument must be a numeric string');
    }
    // ==== verificar que la canica no este dentro de la cadena ====
    // Preguntamos a la cadena si esta el ID de la canica
    let marbleState = await stub.getState(marbleName);
    // el stub.getstate retorna los bits, por tanto hacemos la transformacion a string y preguntamos si es verdadero
    if (marbleState.toString()) {
      throw new Error('This marble already exists: ' + marbleName);
    }
    // ==== Creacion del objeto canica ====
    let marble = {};
    marble.docType = 'marble';
    marble.name = marbleName;
    marble.color = color;
    marble.size = size;
    marble.owner = owner;

    // Fabric almacena los elementos de la cadena en el formato key-data objects
    // === Colocamos la canica dentro de la cadena  ===
    await stub.putState(marbleName, Buffer.from(JSON.stringify(marble)));
    let indexName = 'color~name'
    // Creamos ese objeto key-value
    let colorNameIndexKey = await stub.createCompositeKey(indexName, [marble.color, marble.name]);
    console.info(colorNameIndexKey);
    // Ingresamos la cadena el index, no necesitamos la demas info para no crear duplicados la canica
    //  Note - passing a 'nil' value will effectively delete the key from state, therefore we pass null character as value
    await stub.putState(colorNameIndexKey, Buffer.from('\u0000'));
    console.info('- end init marble');
  }

  // ===============================================
  // Lectura de una canica
  // ===============================================
  async readMarble(stub, args, thisClass) {
    /*
    args: nombre de la canica
    */
    if (args.length != 1) {
      throw new Error('Incorrect number of arguments. Expecting name of the marble to query');
    }
    let name = args[0];
    // no deberia estar vacio
    if (!name) {
      throw new Error(' marble name must not be empty');
    }
    // tomamos el objeto canica de la chaincode
    let marbleAsbytes = await stub.getState(name);
    // Retorna en bits realizamos el cast
    // En caso de que no exista tenemos este error
    if (!marbleAsbytes.toString()) {
      let jsonResp = {};
      jsonResp.Error = 'Marble does not exist: ' + name;
      throw new Error(JSON.stringify(jsonResp));
    }
    console.info('=======================================');
    console.log(marbleAsbytes.toString());
    console.info('=======================================');
    // Se retorna el objeto canica en bits
    return marbleAsbytes;
  }

  // ==================================================
  // Eliminado el key-index de una canica
  // ==================================================
  async delete(stub, args, thisClass) {
    /*
    args: nombre de la canica
    */
    if (args.length != 1) {
      throw new Error('Incorrect number of arguments. Expecting name of the marble to delete');
    }
    let marbleName = args[0];
    if (!marbleName) {
      throw new Error('marble name must not be empty');
    }
    let valAsbytes = await stub.getState(marbleName);
    let jsonResp = {};
    if (!valAsbytes) {
      jsonResp.error = 'marble does not exist: ' + name;
      throw new Error(jsonResp);
    }
    let marbleJSON = {};
    try {
      marbleJSON = JSON.parse(valAsbytes.toString());
    } catch (err) {
      jsonResp = {};
      jsonResp.error = 'Failed to decode JSON of: ' + marbleName;
      throw new Error(jsonResp);
    }
    // Eliminamos el objeto canica de la cadena de bloques
    await stub.deleteState(marbleName);
    // Toca eliminar ahora el index
    let indexName = 'color~name';
    let colorNameIndexKey = stub.createCompositeKey(indexName, [marbleJSON.color, marbleJSON.name]);
    if (!colorNameIndexKey) {
      throw new Error(' Failed to create the createCompositeKey');
    }
    await stub.deleteState(colorNameIndexKey);
  }

  // ===========================================================
  // Transferencia de la canica
  // ===========================================================
  async transferMarble(stub, args, thisClass) {
    //   0       1
    // 'name', 'bob'
    // Se requiere el nombre de la canica y el nombre a la persona que sera transferida
    if (args.length < 2) {
      throw new Error('Incorrect number of arguments. Expecting marblename and owner');
    }
    let marbleName = args[0];
    let newOwner = args[1].toLowerCase();
    console.info('- start transferMarble ', marbleName, newOwner);
    // llamamos la canica de la cadena
    let marbleAsBytes = await stub.getState(marbleName);
    // preguntamos si existe o no
    if (!marbleAsBytes || !marbleAsBytes.toString()) {
      throw new Error('marble does not exist');
    }
    let marbleToTransfer = {};
    // Guardamos el objeto en formato json en la variable marbleToTransfer
    try {
      marbleToTransfer = JSON.parse(marbleAsBytes.toString());
    } catch (err) {
      let jsonResp = {};
      jsonResp.error = 'Failed to decode JSON of: ' + marbleName;
      throw new Error(jsonResp);
    }
    console.info(marbleToTransfer);
    // se modifica el Propietario de la canica
    marbleToTransfer.owner = newOwner;
    // JSON.stringify: cuando nos comucamos con la cadena, enviamos el objeto en formato string
    // Ejemplo del json resultante:{"ID":"canica_0","owner":"Bob"}
    let marbleJSONasBytes = Buffer.from(JSON.stringify(marbleToTransfer));
    // Se reescribe la canica
    await stub.putState(marbleName, marbleJSONasBytes);

    console.info('- end transferMarble (success)');
  }

  // ===========================================================================================
  // Query a un range de keys ingresadas

  // Read-only function results are not typically submitted to ordering. If the read-only
  // results are submitted to ordering, or if the query is used in an update transaction
  // and submitted to ordering, then the committing peers will re-execute to guarantee that
  // result sets are stable between endorsement time and commit time. The transaction is
  // invalidated by the committing peers if the result set has changed between endorsement
  // time and commit time.
  // Therefore, range queries are a safe option for performing update transactions based on query results.
  // ===========================================================================================
  async getMarblesByRange(stub, args, thisClass) {
    /*
    args: llave inicial y llave final
    */
    if (args.length < 2) {
      throw new Error('Incorrect number of arguments. Expecting 2');
    }

    let startKey = args[0];
    let endKey = args[1];

    let resultsIterator = await stub.getStateByRange(startKey, endKey);
    let method = thisClass['getAllResults'];
    let results = await method(resultsIterator, false);
    // Para retronar un buffer con las canicas que se encuentran en ese range
    return Buffer.from(JSON.stringify(results));
  }

  // ==== Ejemplo: GetStateByPartialCompositeKey/RangeQuery =========================================
  // Transferir canicas de solo color rojo
  // ===========================================================================================
  async transferMarblesBasedOnColor(stub, args, thisClass) {
    /*
    primer argumento color de la canica.
    Propietario nuevo segundo argumento
    */
    //   0       1
    // 'color', 'bob'
    if (args.length < 2) {
      throw new Error('Incorrect number of arguments. Expecting color and owner');
    }

    let color = args[0];
    let newOwner = args[1].toLowerCase();
    console.info('- start transferMarblesBasedOnColor ', color, newOwner);

    // Buscamos en la cadena los index, que tenga el color que queremos
    let coloredMarbleResultsIterator = await stub.getStateByPartialCompositeKey('color~name', [color]);

    let method = thisClass['transferMarble'];
    // Hacemos los cambios de propietario en todas las canicas encontradas
    while (true) {
      let responseRange = await coloredMarbleResultsIterator.next();
      if (!responseRange || !responseRange.value || !responseRange.value.key) {
        return;
      }
      console.log(responseRange.value.key);
      let objectType;
      let attributes;
      ({
        objectType,
        attributes
      } = await stub.splitCompositeKey(responseRange.value.key));
      // las variables objectype y attributes retornan los varlores originales de index de las canicas encontradas con el color especificado
      let returnedColor = attributes[0];
      let returnedMarbleName = attributes[1];
      // Color y nombre de la variables
      console.info(util.format('- found a marble from index:%s color:%s name:%s\n', objectType, returnedColor, returnedMarbleName));

      // Usamos el metodo de transferir creado anteriormente para realizar la transferencia
      let response = await method(stub, [returnedMarbleName, newOwner]);
    }
    let responsePayload = util.format('Transferred %s marbles to %s', color, newOwner);
    console.info('- end transferMarblesBasedOnColor: ' + responsePayload);
  }


  // ===== Example: Parameterized rich query =================================================
  // LLamar todas las canicas que son de un mismo propietario
  // Only available on state databases that support rich query (e.g. CouchDB)
  // =========================================================================================
  async queryMarblesByOwner(stub, args, thisClass) {
    //   0
    // 'bob'
    // args nombre del propietario
    if (args.length < 1) {
      throw new Error('Incorrect number of arguments. Expecting owner name.')
    }
    let owner = args[0].toLowerCase();
    let queryString = {};
    queryString.selector = {};
    queryString.selector.docType = 'marble';
    queryString.selector.owner = owner;
    // metodo que es creado mas adelante
    let method = thisClass['getQueryResultForQueryString'];
    let queryResults = await method(stub, JSON.stringify(queryString), thisClass);
    return queryResults;
  }

  // ===== Example: Ad hoc rich query ========================================================
  // Funcion para llamar a canicas
  // Only available on state databases that support rich query (e.g. CouchDB)
  // =========================================================================================
  async queryMarbles(stub, args, thisClass) {
    //   0
    // 'queryString'
    if (args.length < 1) {
      throw new Error('Incorrect number of arguments. Expecting queryString');
    }
    let queryString = args[0];
    if (!queryString) {
      throw new Error('queryString must not be empty');
    }
    let method = thisClass['getQueryResultForQueryString'];
    let queryResults = await method(stub, queryString, thisClass);
    return queryResults;
  }

  async getAllResults(iterator, isHistory) {
    let allResults = [];
    while (true) {
      let res = await iterator.next();

      if (res.value && res.value.value.toString()) {
        let jsonRes = {};
        console.log(res.value.value.toString('utf8'));

        if (isHistory && isHistory === true) {
          jsonRes.TxId = res.value.tx_id;
          jsonRes.Timestamp = res.value.timestamp;
          jsonRes.IsDelete = res.value.is_delete.toString();
          try {
            jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
          } catch (err) {
            console.log(err);
            jsonRes.Value = res.value.value.toString('utf8');
          }
        } else {
          jsonRes.Key = res.value.key;
          try {
            jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
          } catch (err) {
            console.log(err);
            jsonRes.Record = res.value.value.toString('utf8');
          }
        }
        allResults.push(jsonRes);
      }
      if (res.done) {
        console.log('end of data');
        await iterator.close();
        console.info(allResults);
        return allResults;
      }
    }
  }

  // =========================================================================================
  // getQueryResultForQueryString executes the passed in query string.
  // Result set is built and returned as a byte array containing the JSON results.
  // =========================================================================================
  async getQueryResultForQueryString(stub, queryString, thisClass) {

    console.info('- getQueryResultForQueryString queryString:\n' + queryString)
    let resultsIterator = await stub.getQueryResult(queryString);
    let method = thisClass['getAllResults'];

    let results = await method(resultsIterator, false);

    return Buffer.from(JSON.stringify(results));
  }

  async getHistoryForMarble(stub, args, thisClass) {

    if (args.length < 1) {
      throw new Error('Incorrect number of arguments. Expecting 1')
    }
    let marbleName = args[0];
    console.info('- start getHistoryForMarble: %s\n', marbleName);

    let resultsIterator = await stub.getHistoryForKey(marbleName);
    let method = thisClass['getAllResults'];
    let results = await method(resultsIterator, true);

    return Buffer.from(JSON.stringify(results));
  }

  // ====== Pagination =========================================================================
  // Pagination provides a method to retrieve records with a defined pagesize and
  // start point (bookmark).  An empty string bookmark defines the first "page" of a query
  // result. Paginated queries return a bookmark that can be used in
  // the next query to retrieve the next page of results. Paginated queries extend
  // rich queries and range queries to include a pagesize and bookmark.
  //
  // Two examples are provided in this example. The first is getMarblesByRangeWithPagination
  // which executes a paginated range query.
  // The second example is a paginated query for rich ad-hoc queries.
  // =========================================================================================

  // ====== Example: Pagination with Range Query ===============================================
  // getMarblesByRangeWithPagination performs a range query based on the start & end key,
  // page size and a bookmark.
  //
  // The number of fetched records will be equal to or lesser than the page size.
  // Paginated range queries are only valid for read only transactions.
  // ===========================================================================================
  async getMarblesByRangeWithPagination(stub, args, thisClass) {
    if (args.length < 2) {
      throw new Error('Incorrect number of arguments. Expecting 2');
    }
    const startKey = args[0];
    const endKey = args[1];

    const pageSize = parseInt(args[2], 10);
    const bookmark = args[3];

    const { iterator, metadata } = await stub.getStateByRangeWithPagination(startKey, endKey, pageSize, bookmark);
    const getAllResults = thisClass['getAllResults'];
    const results = await getAllResults(iterator, false);
    // use RecordsCount and Bookmark to keep consistency with the go sample
    results.ResponseMetadata = {
      RecordsCount: metadata.fetched_records_count,
      Bookmark: metadata.bookmark,
    };
    return Buffer.from(JSON.stringify(results));
  }

  // =========================================================================================
  // getQueryResultForQueryStringWithPagination executes the passed in query string with
  // pagination info. Result set is built and returned as a byte array containing the JSON results.
  // =========================================================================================
  async queryMarblesWithPagination(stub, args, thisClass) {

    //   0
    // "queryString"
    if (args.length < 3) {
      return shim.Error("Incorrect number of arguments. Expecting 3")
    }

    const queryString = args[0];
    const pageSize = parseInt(args[2], 10);
    const bookmark = args[3];

    const { iterator, metadata } = await stub.GetQueryResultWithPagination(queryString, pageSize, bookmark);
    const getAllResults = thisClass['getAllResults'];
    const results = await getAllResults(iterator, false);
    // use RecordsCount and Bookmark to keep consistency with the go sample
    results.ResponseMetadata = {
      RecordsCount: metadata.fetched_records_count,
      Bookmark: metadata.bookmark,
    };

    return Buffer.from(JSON.stringify(results));
  }
};

shim.start(new Chaincode());
