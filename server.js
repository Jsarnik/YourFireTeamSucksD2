// Get the packages we need
var express = require('express');
var https = require('https');
var http = require('http');
var request = require('request');
var bodyParser = require('body-parser');
var ejs = require('ejs');
var session = require('express-session');
var timeout = require('connect-timeout');
var config = require('./config');
var manifestService = require('./nodeServices/ManifestService');
var activityMatch = require('./nodeServices/ActivityMatchService');
var playerProfile = require('./nodeServices/PlayerProfileService');
var itemsService = require('./nodeServices/itemsService');
var jsonLoaderService = require('./nodeServices/JsonLoaderService');
// Create our Express application
var app = express();
var destinyBaseRequest = request.defaults({headers: {'X-API-Key': config.default.credentials.apiKey}});

//Set our SSL config.default.credentials
// const privateKey = fs.readFileSync('./ssl/key.pem', 'utf8');
// const certificate = fs.readFileSync('./ssl/cert.pem', 'utf8');
// const passphrase = fs.readFileSync('./ssl/passphrase.txt', 'utf8');
// const sslOptions = {key:privateKey, cert: certificate, passphrase: passphrase};

// Set view engine to ejs
app.set('view engine', 'ejs');

// Use the body-parser package in our application
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

var router = express.Router();

router.get('/getUpdatedManifest', function(req, res, next){
  manifestService.ManifestService.checkManifestVersion(function(err, response){
      var result = response;
      res.status(200);
      if(err){
        console.log(err);
        res.status(500);
        result = {ErrorCode: 500};
      }

      res.json(result);
  });
});


router.get('/getMembershipIdByUserName', function(req, res, next){
  config.default.credentials.defaultMemberType = req.query.memberType;
    var user = req.query.userName;

    if(user.charAt(0) === '#'){
      user = user.substring(1, user.length-1);
    }

    destinyBaseRequest(config.default.destiny2_host + 'SearchDestinyPlayer/' + config.default.credentials.defaultMemberType + '/' + user + '/',
        function (err, response, body) {
          var jsonResponse, result;
          res.setHeader('Content-Type', 'application/json');
          res.status(200);

          try {
            jsonResponse = JSON.parse(body);
          } catch (e) {
            res.status(500);
            result = {ErrorCode: 500, Error: e};
          }

          if(jsonResponse && jsonResponse.Response){
            result = jsonResponse.Response[0];

            if(jsonResponse.ErrorCode > 1){
              res.status(401);
              result = {ErrorCode: 401, Error: jsonResponse.Message};
            }
          }

          res.json(result);
    });
});
   
router.get('/getCharacterInfoByMembershipId', function(req, res, next){
    destinyBaseRequest(config.default.destiny2_host + config.default.credentials.defaultMemberType + '/Profile/' + req.query.membershipId + '/?components=100,200',
        function (err, response, body) {
          var jsonResponse, result;
          res.setHeader('Content-Type', 'application/json');
          res.status(200);

          try {
            result = jsonResponse = JSON.parse(body);
          } catch (e) {
            res.status(500);
            result = {ErrorCode: 500, Error: e};
          }

          res.json(result);
    });
});

router.get('/getCharacterStatsById', function(req, res, next){
    destinyBaseRequest(config.default.destiny2_host + '/Stats/AggregateActivityStats/' + config.default.credentials.defaultMemberType+ '/' + req.query.membershipId + '/' + req.query.characterId + '/',
        function (err, response, body) {
          var jsonResponse, result;
          res.setHeader('Content-Type', 'application/json');
          res.status(200);

          try {
            result = jsonResponse = JSON.parse(body);
          } catch (e) {
            res.status(500);
            result = {ErrorCode: 500, Error: e};
          }

          res.json(result);
    });
});

router.post('/getCharacterActivityHistoryData', function(req, res, next){
    res.status(200);
    var activitySearchOptions = req.body.params.data;
    activityMatch.ActivityMatchService.getActivities(activitySearchOptions, function(err, response){
      var result = {};
      if(err){
        res.status(500);
        result = {ErrorCode: 500, Error: err};
      }else{
        result.Response = response;
      }
      res.json(result);
    });
});

router.get('/getPostGameCarnageReport', function(req, res, next){
    destinyBaseRequest(config.default.destiny2_host + '/Stats/PostGameCarnageReport/' + req.query.instanceId,
        function (err, response, body) {
          var jsonResponse, result;
          res.setHeader('Content-Type', 'application/json');
          res.status(200);

          try {
            result = jsonResponse = JSON.parse(body);
          } catch (e) {
            res.status(500);
            result = {ErrorCode: 500, Error: e};
          }

          if(jsonResponse){
            playerProfile.PlayerProfileService.appendActivityPlayersCharacterInformation(jsonResponse.Response, function(err, activityDetailsWithCharacterProfiles){
              var queryString = "SELECT DISTINCT json FROM DestinyActivityDefinition WHERE json like '%" + activityDetailsWithCharacterProfiles.activityDetails.referenceId + "%'";
              manifestService.ManifestService.queryManifest('world.content', queryString, function(err, activityDefinition){
                var parsedDef = null;
                try{
                  parsedDef = JSON.parse(activityDefinition);
                }catch(e){
                  console.log(activityDefinition)
                  console.log(e);
                }
                activityDetailsWithCharacterProfiles.definitions = parsedDef;
                res.json(jsonResponse);
              });
            });
          }
          else{
            res.json(result);
          }
          
    });
});

router.get('/getWeaponDefinitionById', function(req, res, next){
      destinyBaseRequest(config.default.destiny2_host + config.default.credentials.defaultMemberType + '/' + 
        '/Account/' + req.query.membershipId + '/' + 
        'Character/' +
        req.query.characterId + '/' + 
        'ItemReference/' +
        req.query.referenceId + '/' + 
        '/?definitions=true',
        function (err, response, body) {
          var jsonResponse, result;
          res.setHeader('Content-Type', 'application/json');
          res.status(200);

          try {
            result = jsonResponse = JSON.parse(body).definitions.items[req.query.referenceId];
          } catch (e) {
            res.status(500);
            result = {ErrorCode: 500, Error: e};
          }

          res.json(result);
    });
});

router.get('/getCharacterInfoDetails', function(req, res, next){
    destinyBaseRequest(config.default.destiny2_host + config.default.credentials.defaultMemberType + '/Profile/' + req.query.membershipId + 
      '/Character/' + req.query.characterId + '/?components=100,200,201,205,300',
      function (err, response, body) {
        var jsonResponse, result;
        res.setHeader('Content-Type', 'application/json');
        res.status(200);

        try {
          result = jsonResponse = JSON.parse(body);
        } catch (e) {
          res.status(500);
          result = {ErrorCode: 500, Error: e};
        }

        if(jsonResponse && jsonResponse.Response && jsonResponse.Response.equipment){
          //get equipped items
          itemsService.ItemsService.GetItems(req.query.membershipId, jsonResponse.Response.equipment.data.items, function(err, itemResults){
            if(!err){
              jsonResponse.Response.equipment.data = itemResults;
              result = jsonResponse;
            }
            else{
              console.log(err);
            }
            res.json(result);
          });
        }
    });
});

router.post('/manifest/getActivityDefinitions', function(req, res, next){
  var query = req.body.sqliteQ;
  manifestService.ManifestService.queryManifest('world.content', query,
      function (err, response) {
        res.setHeader('Content-Type', 'application/json');
        res.status(200);
        res.json(response);
  });
});

app.use(timeout(120000));
app.use(haltOnTimedout);

function haltOnTimedout(req, res, next){
  if (!req.timedout) next();
}

app.use(express.static(__dirname + '/app'));

app.get('/', function(req, res) {
    res.sendfile('index.html');
});

// Register all our routes with /api
app.use('/api', router);

var httpServer = http.createServer(app);
//var httpsServer = https.createServer(sslOptions, app);

// Use environment defined port or 3000
var httpPort = process.env.PORT || 3000;
//var httpsPort = process.env.PORT || 8000;

// Start the http server
httpServer.listen(httpPort, function(err) {
    console.log(err, httpServer.address());
    manifestService.ManifestService.initialize();
}); 

// Start the https server
// httpsServer.listen(httpsPort, "127.0.0.1", function(err) {
//     console.log(err, httpsServer.address());
// });
