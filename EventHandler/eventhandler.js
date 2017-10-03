/**
  *
  * main() will be invoked when you Run This Action.
  * 
  * @param OpenWhisk actions accept a single parameter,
  *        which must be a JSON object.
  *
  * In this case, the params variable will look like:
  *     { "message": "xxxx" }
  *
  * @return which must be a JSON object.
  *         It will be the output of this action.
  *
  */
  
var Cloudant = require('cloudant');
var redis , geo , mydb;
var redisClient = require('redis');

/*
function mn(params) {
    let message  = { message: "default"}



    console.log ( "params is "+ JSON.stringify(params, null, "\t") )
    let url = params['services.cloudant.url']
    let dbName = params['services.cloudant.database']
    console.log ("db url:" + url + " dbName:" + dbName) ;

    let cloudant = Cloudant({url:url, plugin:'retry', retryAttempts:5, retryTimeout:1000 , plugin:'promises'});
    mydb = cloudant.db.use(dbName);
    let redisUrl = params['services.redis.url']
    redis = redisClient.createClient(redisUrl)
    geo = require('georedis').initialize(redis, { zset: "hotels"});


    console.log ( params)
    if ( params.id ) {
        getDocument(params.id, function(err, doc){
            if ( !err){
                var message = createRedisEntry( doc);
                return message;
            }else {
                console.log ( err);
                message = { message: err}
                return message ;
            }
        })
    }else {
        return message ;
    }
	
}*/

exports.main = function (params) {
    var message  = { message: "default"}
    console.log ( "params is "+ JSON.stringify(params, null, "\t") )
    var url = params['services.cloudant.url']
    var dbName = params['services.cloudant.database']
    console.log ("db url:" + url + " dbName:" + dbName) ;

    var cloudant = Cloudant({url:url, plugin:'retry', retryAttempts:5, retryTimeout:1000 , plugin:'promises'});
    mydb = cloudant.db.use(dbName);
    var redisUrl = params['services.redis.url']
    redis = redisClient.createClient(redisUrl)
    geo = require('georedis').initialize(redis, { zset: "hotels"});

   return new Promise( function(resolve, reject){

   
    
        if ( params.id ) {
            getDocument(params.id, function(err, doc){
                if ( !err){
                    var message = createRedisEntry( doc);
                    console.log ("return message is " + JSON.stringify(message, null, "\t") )
                    resolve( message) ;
                }else {
                    console.log ("error occured:" +  JSON.stringify(err, null, "\t"));
                    reject( { message: err} );
                }
            })
        }else {
            resolve( {message: "doc does not contain id"} ) ;
        }
   });
}

function createRedisLocationEntry(doc, cb ){
    let message = "";
     var location = {
        'autoId' : doc.Payload.autoId,
        'id': doc.Payload.placeId,
        'displayname': doc.Payload.name,
        'acname': doc.Payload.name.toLowerCase(),    
        'fullname': doc.Payload.fullname,
        'icon': doc.Payload.icon ? doc.Payload.icon : '',
        'latitude': doc.Payload.coordinates.lat ,
        'longitude': doc.Payload.coordinates.lng,
        'city':doc.Payload.city,
        'state':doc.Payload.state,
        'country': doc.Payload.country 
    }
    
    locationname = location['acname']
    for ( var i =0 ; i<locationname.length ; i++){
            locationfragment = locationname.substring(0,i+1)
            redis.zadd('locationfragments', 0, locationfragment)
    }   
    
    locationwithid = locationname + '%L-' + location['id'] + '%'
    redis.zadd('locationfragments', 0, locationwithid)
    
    locationkey = 'L-' + location['id']
    redis.del(locationkey, function(err,resp){
        if (err){
            cb(err, null);
        }else {
            redis.rpush(locationkey, location['autoId'],
                            location['displayname'],
                            location['acname'],
                            location['icon'],
                            location['latitude'],
                            location['longitude'],
                            location['city'],
                            location['state'],
                            location['country'],
                            location['fullname'],
                            location['id'] , 
                            function ( err, resp){
                                    if ( err){
                                        cb (err, null);
                                    }else{
                                        message = "entry added successfully."
                                        cb ( null, message);
                                    }
                            }) ; 
   
        }
    })
    
    
}

function createRedisPropertyEntry(doc){

    var hotel = {
        'autoId': doc.Payload.autoId ,
        'id': doc.Payload.placeid,
        'displayname': doc.Payload.name,
        'fullname': doc.Payload.fullname,
        'acname': doc.Payload.name.toLowerCase(),    
        'image': doc.Payload.icon ? doc.Payload.icon : '',
        'latitude': doc.Payload.coordinates.lat ,
        'longitude': doc.Payload.coordinates.lng,
        'city':doc.Payload.city,
        'state':doc.Payload.state,
        'country': doc.Payload.country ,
        'rating' : 3 
    }
    
  
  hotelkey = 'H-' + hotel['id']
  geo.addLocation(hotelkey,{ latitude : hotel['latitude'], longitude: hotel['longitude']})
  //re('geoadd', 'hotels', hotel['longitude'],  hotel['latitude'], hotelkey)
  redis.del(hotelkey)
  
  redis.rpush(hotelkey, hotel['autoId'])
  redis.rpush(hotelkey, hotel['displayname'])
  redis.rpush(hotelkey, hotel['acname'])
  redis.rpush(hotelkey, hotel['image'])
  redis.rpush(hotelkey, hotel['latitude'])
  redis.rpush(hotelkey, hotel['longitude'])  
  redis.rpush(hotelkey, hotel['rating'])
  redis.rpush(hotelkey, hotel['city'])
  redis.rpush(hotelkey, hotel['state'])
  redis.rpush(hotelkey, hotel['country'])
  redis.rpush(hotelkey, hotel['fullname'])
  redis.rpush(hotelkey, hotel['id'])
  

}

function createRedisEntry( doc){
    

    let message = 'Event ignored'
    
    if ( doc.Name == 'LocationCreated'){
        
        createRedisLocationEntry(doc, function(err, resp){
            
            if ( err){
                message = "there was an error "
            }else {
                 message =   'Location added : ' + doc.Payload.name 
            }
        })       
       
    }else if (doc.Name == 'PropertyCreated'){
        createRedisPropertyEntry(doc)
        message =   'Property added : ' + doc.Payload.name 
    }
    return { 'message': message }   
}

function getDocument(id, cb){
   mydb.get(id)
   .then(function(doc){
        //console.log ( doc)
        cb(null, doc ); 
   },function(error){
        //console.log (error)
        cb( err)
   });

}

/*
mn({ "id": "6c90e290-a83f-11e7-9e50-abbd340e779d" ,
    "services.cloudant.url": "https://e8cfde78-640c-4072-9cad-ed9c582854af-bluemix:a388b27ddb5fb9ccd1d94b78285c11127b60dc6a1ac4544ce3fad830baf61189@e8cfde78-640c-4072-9cad-ed9c582854af-bluemix.cloudant.com",
    "services.cloudant.database": "eventsdb",
    "services.redis.url": "redis://169.51.13.228:31000"

})
*/
/*
try{
    getDocument(id,createRedisEntry);
}catch( err){
    console.log ( err)
}*/


