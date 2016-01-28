import _ from 'underscore';
import StringHelpers from 'common/StringHelpers';

export default class DocumentOperations {

  constructor(documentType, documentTypePlural, client, properties = []) {
    this.documentType = documentType;
    this.documentTypePlural = documentTypePlural;
    this.client = client;
    this.properties = properties;

    this.selectDefault = "ecm:currentLifeCycleState <> 'deleted'";
  }


  /**
  * Get a single document of a certain type based on a path and title match
  * This document may or may not contain children 
  */
  getDocumentByPathAndTitle(path = "", title, headers = null, params = null) {
    // Expose fields to promise
    let client = this.client;
    let selectDefault = this.selectDefault;
    let domain = this.properties.domain;

    path = StringHelpers.clean(path);
    title = StringHelpers.clean(title);

    // Initialize an empty document from type
    let documentType = this.documentType;

    return new Promise(
        // The resolver function is called with the ability to resolve or
        // reject the promise
        function(resolve, reject) {

          let defaultParams = {
            query: 
              "SELECT * FROM " + documentType.prototype.entityTypeName + " WHERE (ecm:path STARTSWITH '/" + domain + path + "' AND dc:title LIKE '" + title + "' AND  " + selectDefault + ")"
          };

          let defaultHeaders = {};

          params = Object.assign(defaultParams, params);
          headers = Object.assign(defaultHeaders, headers);

          client.operation('Document.Query')
            .params(params)
            .execute(headers, function(error, response) {
              if (error) {
                throw error;
              }             
              if (response.entries.length > 0) {
                resolve(new documentType(response.entries[0]));
              } else {
                reject('No ' + documentType.prototype.entityTypeName +' found');
              }
          });
    });
  }

  /**
  * Get a single document by ID
  */
  getDocumentByID(id, headers = null, params = null) {
    // Expose fields to promise
    let client = this.client;
    let selectDefault = this.selectDefault;

    id = StringHelpers.clean(id);

    // Initialize an empty document from type
    let documentType = this.documentType;

    return new Promise(
        // The resolver function is called with the ability to resolve or
        // reject the promise
        function(resolve, reject) {

          let defaultParams = {
            query: 
              "SELECT * FROM " + documentType.prototype.entityTypeName + " WHERE (ecm:uuid='" + id + "' AND  " + selectDefault + ")"
          };

          let defaultHeaders = {};

          params = Object.assign(defaultParams, params);
          headers = Object.assign(defaultHeaders, headers);

          client.operation('Document.Query')
            .params(params)
            .execute(headers, function(error, response) {
              if (error) {
                throw error;
              }             
              if (response.entries.length > 0) {
                resolve(new documentType(response.entries[0]));
              } else {
                reject('No ' + documentType.prototype.entityTypeName +' found');
              }
          });
    });
  }

  /**
  * Get a related media by document
  */
  getMediaByDocument(document, headers = null, params = null) {
    // Expose fields to promise
    let client = this.client;
    let selectDefault = this.selectDefault;

    return new Promise(
        // The resolver function is called with the ability to resolve or
        // reject the promise
        function(resolve, reject) {

          var related_media = document.get("fv:related_audio").concat(document.get("fv:related_pictures"), document.get("fv:related_video"));
          related_media = _.map(_.compact(related_media), function(value){ return "'" + value + "'"; }).join();

          let defaultParams = {
            query: 
              "SELECT * FROM Document WHERE (ecm:uuid IN (" + related_media + ") AND (ecm:primaryType = 'FVAudio' OR ecm:primaryType = 'FVVideo' OR ecm:primaryType = 'FVPicture') AND  " + selectDefault + ")"
          };

          let defaultHeaders = {};

          params = Object.assign(defaultParams, params);
          headers = Object.assign(defaultHeaders, headers);

          client.operation('Document.Query')
            .params(params)
            .execute(headers, function(error, response) {
              if (error) {
                throw error;
              }             
              if (response.entries.length > 0) {
                resolve(response.entries);
              } else {
                reject('No media found');
              }
          });
    });
  }

  /**
  * TODO: Change to more official method if exists?
  * Get Blob, Or https://github.com/dcodeIO/protobuf.js/wiki/How-to-read-binary-data-in-the-browser-or-under-node.js%3F
  * https://github.com/request/request/issues/1796
  */
  getMediaBlobById(id, mimeType, xpath = 'file:content') {
    // Expose fields to promise
    let client = this.client;

    return new Promise(
      function(resolve, reject) {

        var request = new XMLHttpRequest();

        request.onload = function(e) {
          if (request.readyState == 4) {
              var uInt8Array = new Uint8Array(this.response);
              var i = uInt8Array.length;
              var biStr = new Array(i);
              while (i--) { 
                biStr[i] = String.fromCharCode(uInt8Array[i]);
              }
              var data = biStr.join('');
              var base64 = window.btoa(data);

            var dataUri = 'data:' + mimeType + ';base64,' + base64;
            resolve({dataUri: dataUri, mediaId: id});
          } else {
            reject("Media not found");
          }
        }

        request.open("POST", client._baseURL + "/site/automation/Blob.Get", true);
        request.responseType = "arraybuffer";
        request.setRequestHeader("authorization", "Basic " + window.btoa(unescape(encodeURIComponent(client._auth.username + ":" + client._auth.password))));
        request.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        request.setRequestHeader("Content-Type", "application/json+nxrequest");
        request.send(JSON.stringify({input: id, params: {xpath: xpath}}));

    });
  }

/*
  getMediaByDocument(client, word, query = null) {

    return new Promise(
      // The resolver function is called with the ability to resolve or
      // reject the promise
      function(resolve, reject) {

        var related_media = word.get("fv:related_audio").concat(word.get("fv:related_pictures"), word.get("fv:related_video"));

        related_media = _.map(_.compact(related_media), function(value){ return "'" + value + "'"; }).join();

        var addQuery = "";

        if (query != null) {
          addQuery = " AND " + query;
        }

        client.operation('Document.Query')
          .params({
            query: "SELECT * FROM Document WHERE (ecm:uuid IN (" + related_media + ") AND ecm:currentLifeCycleState <> 'deleted' AND (ecm:primaryType = 'FVAudio' OR ecm:primaryType = 'FVVideo' OR ecm:primaryType = 'FVPicture'))" + addQuery
          })
        .execute(function(error, response) {

          // Handle error
          if (error) {
            throw error;
          }

          if (response.entries.length > 0) {
            resolve(response.entries);
          } else {
            reject('Workspace not found');
          }

        });
    });
  }
*/

  getWordById(client, word) {
    return new Promise(
      // The resolver function is called with the ability to resolve or
      // reject the promise
      function(resolve, reject) {

        word = StringHelpers.clean(word);

        client.operation('Document.Query')
          .params({
            query: "SELECT * FROM FVWord WHERE (ecm:uuid = '" + word + "')"
          })
        .execute(function(error, response) {

          // Handle error
          if (error) {
            throw error;
          }

          if (response.entries.length > 0) {
            response.entries[0].client = client;
              resolve(new Word(response.entries[0]));
          } else {
            reject('Workspace not found');
          }

        });
    });
  }

  getDocumentsByDialect(client, dialect, query = null, headers = null, params = null) {

    // Initialize and empty document list from type
    let documentList = new this.documentTypePlural(null);

    return new Promise(
        function(resolve, reject) {

          let defaultParams = {
            query: 
              "  SELECT * FROM " + documentList.model.prototype.entityTypeName + 
              "  WHERE (fva:dialect = '" + dialect.get('id') + 
              "' AND ecm:currentLifeCycleState <> 'deleted')" + 
                 ((query) ? (" AND " + query) : "" ) + 
              "  ORDER BY dc:title"
          };

          let defaultHeaders = {
            'X-NXenrichers.document': 'parentDoc'
          };

          params = Object.assign(defaultParams, params);
          headers = Object.assign(defaultHeaders, headers);

          client.operation('Document.Query')
            .params(params)
            .execute(headers, function(error, response) {

              if (error) {
                throw error;
              }

              documentList.add(response.entries);
              resolve(documentList.toJSON());
          });
    });
  }

  getDocumentCountByDialect(client, dialect, query = null, headers = null, params = null) {

    // Initialize and empty document list from type
    let documentType = new this.documentType(null);

    return new Promise(
        function(resolve, reject) {

          let defaultParams = {
            query: 
              "  SELECT COUNT(ecm:uuid) FROM " + documentType.entityTypeName + 
              "  WHERE (fva:dialect = '" + dialect.get('id') + 
              "' AND ecm:currentLifeCycleState <> 'deleted')" + 
                 ((query) ? (" AND " + query) : "" )
          };

          let defaultHeaders = {
            'X-NXenrichers.document': 'parentDoc'
          };

          params = Object.assign(defaultParams, params);
          headers = Object.assign(defaultHeaders, headers);

          client.operation('Repository.ResultSetPageProvider')
            .params(params)
            .execute(headers, function(error, response) {

              if (error) {
                throw error;
              }

              // TODO: More predictable way to get this value
              resolve(_.values(response.entries[0])[0]);
          });
    });
  }
}