require('dotenv').config()
var xlsxRows = require('xlsx-rows');
var rpnative = require('request-promise-native');
var path = require('path');
var API_KEY, API_HOST, API_SECRET
var sleep  = require('system-sleep');

exports.main = function (params){

   
    var locationrows = xlsxRows( { file: path.join( __dirname, './datav4.xlsx') , sheetname: "locations"});
    var hotelrows = xlsxRows( { file: path.join( __dirname, './datav4.xlsx'), sheetname: "hotels"});
    API_KEY = params['services.api.key']
    API_SECRET = params['services.api.secret']
    API_HOST = params['services.api.URL']

    //console.log ( locationrows)
    return addLocations(locationrows)
    .then( function( locations){
        console.log ("added locations ") ;
        locations.forEach(function(location){
            console.log (   location);
        })
         sleep(2000);
        return addProperties(hotelrows) ;
    })
    .then(function(properties){
        console.log ( "added properties") ;
        properties.forEach(function(property){
            console.log (  property);
        })
        return { message: "Added locations and properties "}
    })
    .catch(function(err){
        console.log (err);
        return { message: err }
    })


}

function addLocations(rows){
    var index = 0 ;
    let promises = [];
    
        rows.forEach(function(row){
            if ( index == 0 ){
                // header
            }else{
                if ( index % 6 == 0 ){
                        sleep(2000);
                }
                promises.push (  addLocation(row) );
            }
            index++;
        })
        return Promise.all(promises) ;
          

}


function addLocation(row){

 return new Promise(function(resolve,reject){

        var requestBody = { 
            Name: "LocationCreated",
            Payload: { autoId: row[0] , name: row[3] , fullname:row[2] , city: row[5], state: row[6] , country: row[7]  , coordinates: { lat: row[9] , lng: row[10] } , icon: row[8] , placeId: row[1]},
            EventId : row[1]+":" + "ADD"
        }
        

        var options = { method: 'POST',
            url:  API_HOST +  '/api/Events',
            headers: 
            { accept: 'application/json',
                'content-type': 'application/json',
                'x-ibm-client-secret': API_SECRET,
                'x-ibm-client-id': API_KEY },
            body:  requestBody,
            json: true 
        };


        rpnative(options)
        .then(function(data){
             resolve(data);
        })
        .catch(function(err){
             reject(err);
        })

    })
}

function addProperties(rows){

    var promises =[] ;
    var index = 0 ;
    rows.forEach(function(row){
        if ( index > 0 ) {
            if ( index % 6 == 0 ){
                sleep(2000);
            }
            promises.push(addProperty(row) );
        }
        index ++ ;
    })
    return Promise.all( promises);
}

function addProperty(row){
   return new Promise(function(resolve,reject){

        var requestBody = { 
            Name: "PropertyCreated",
            Payload: { autoId: row[0] , name: row[3] , fullname:row[2] , area: row[5], city: row[6], state: row[7] , country: row[8]  , coordinates: { lat: row[10] , lng: row[11] } , icon: row[9] , placeid: row[1]},
            EventId : row[1]+":" + "ADD"
        }
        

        var options = { method: 'POST',
            url:  API_HOST +  '/api/Events',
            headers: 
            { accept: 'application/json',
                'content-type': 'application/json',
                'x-ibm-client-secret': API_SECRET,
                'x-ibm-client-id': API_KEY },
            body:  requestBody,
            json: true 
        };


        rpnative(options)
        .then(function(data){
             resolve(data);
        })
        .catch(function(err){
             reject(err);
        })

    })

}

