var express = require('express');
var stormpath = require('express-stormpath');
var app = express();
var url = 'mongodb://heroku_5b8lzhhj:a51mrcacca61to0vl361ubg9c@ds017185.mlab.com:17185/heroku_5b8lzhhj';
var assert = require('assert');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;

app.use(stormpath.init(app, {
  website: true,
    apiKey: {
      id: 'D3U4KQFMDVO07QUI9XGX8OE0X', 
      secret: 'l2eMbWrjbw4ctl8ANLtjnu2J0wr2s5+XksGCAqoir60'
    },
 application: {
   href: 'https://api.stormpath.com/v1/applications/1HC2ezy1fptQ2dtJyd4x4I',
 }
}));

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// render the home page of the app
app.get('/', function(request, response) {
  response.render('pages/index');
});

// render the user page of the app
app.get('/userWall', function(request, response) {
  response.render('pages/user');
});

// render the add image page
app.get('/add', stormpath.loginRequired, function(req, res){
    console.log('User:', req.user.email, 'just accessed the /dashboard page!');
  res.render('pages/add');
});

// process the form data to add images to the database
app.get('/processData', stormpath.loginRequired, function(req, res){
  // insert the data into the database
  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    insertDocument(db, function() {
        db.close();
        res.redirect("/");
    }, req.query.title, req.query.url, req.user.email );
  });
});

// render the my pins page
app.get('/myPins', stormpath.loginRequired, function(req, res){
  res.render('pages/mypins', { name: req.user.email });
});

// render the my pins page
app.get('/getMyPins', stormpath.loginRequired, function(req, res){
  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    findUserImages(db, function(images) {
        db.close();
        res.json({"images":images});
    },req.user.email);
  });
});

//
// render the my pins page
app.get('/getUserPins', function(req, res){
    var email = req.query.email;
  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    findUserImages(db, function(images) {
        db.close();
        res.json({"images":images});
    }, email);
  });
});

// get all of the images
app.get('/getImages', function(req, res){
  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    findImages(db, function(images) {
        db.close();
        res.json({"images":images});
    });
  });
});

// delete image
app.get('/deleteImage', function(req, res){
    var id = req.query.id;
    MongoClient.connect(url, function(err, db) {
        assert.equal(null, err);
        deleteImages(db, function() {
            db.close();
            res.redirect("/");
        }, id);
    });
});

app.on('stormpath.ready', function() {
  app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
  });
});

// insert an image into the image database
var insertDocument = function(db, callback, title, url, username) {
   db.collection('images').insertOne( {
     "user" : username,
     "url" : url,
     "name" : title
   }, function(err, result) {
    assert.equal(err, null);
    console.log("Inserted a document into the images collection.");
    callback();
  });
};

// query the database to pull all of the images
var findImages = function(db, callback) {
    var images = [];
   var cursor =db.collection('images').find( );
   cursor.each(function(err, doc) {
      assert.equal(err, null);
      if (doc != null) {
         images.push(doc);
      } else {
         callback(images);
      }
   });
};

// query the database to pull all of the images for an user
var findUserImages = function(db, callback, username) {
  var images = [];
   var cursor =db.collection('images').find( { "user": username } );
   cursor.each(function(err, doc) {
      assert.equal(err, null);
      if (doc != null) {
         images.push(doc);
      } else {
         callback(images);
      }
   });
};

var deleteImages = function(db, callback, id) {
   db.collection('images').deleteMany(
      {_id: new ObjectId(id)},
      function(err, results) {
         console.log(results);
         callback();
      }
   );
};