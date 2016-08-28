var express = require('express');
var request = require('request');
var stormpath = require('express-stormpath');
var app = express();
var url = 'Your Mongo Labs DB URL';
var assert = require('assert');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var session = require('express-session');

app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 600000000000 }}))

app.use(stormpath.init(app, {
  website: true,
    apiKey: {
      id: 'Your Stormpath API Key Id', 
      secret: 'Your Stormpath API Key Secret'
    },
 application: {
   href: 'Your Stormpath URL',
 }
}));

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// render the home page of the app
app.get('/', stormpath.getUser, function(req, res) {
    if (req.user) {
		res.render('pages/index', { user2 : req.user.email });
	}
	else if (req.session.user) {
	    res.render('pages/index', { user2 : req.session.user});
	}
	else {
		res.render('pages/index', { user2 : null });
	}
});

// start the twitter authorization flow
app.get('/twitterLogin',function(req, res) {
    var url = "https://api.twitter.com/oauth/request_token";
    var oauth = {
            consumer_key: 'Your twitter consumer_key',
            consumer_secret: 'Your twitter consumer_secret',
            callback: 'Your callback URL'
        };
    request.post({
        url: url,
        oauth: oauth,
        json: true,
        headers: {
            'Content-Type': 'application/json'
        }
    }, function (e, r, b) {
        //console.log(JSON.stringify(b));
        var twitterTokens = b.split("&");
        // step 2
        url = 'https://api.twitter.com/oauth/authenticate?'+twitterTokens[0];
        res.redirect(url);
    });
});

// callback from the twitter authroization flow
app.get('/callback', function(req, res) {
    //console.log(req.query);
        var oauth = {
            consumer_key: 'Your twitter consumer_key',
            consumer_secret: 'Your twitter consumer_secret',
            token: req.query.oauth_token
        };
    var url = 'https://api.twitter.com/oauth/access_token?oauth_verifier='+req.query.oauth_verifier;
        request.post({
        url: url,
        oauth: oauth,
        json: true,
        headers: {
            'Content-Type': 'application/json'
        }
    }, function (e, r, b) {
        //console.log(JSON.stringify(b));
        var tempVar = getQueryVariable("screen_name", b);
          var sess = req.session;
          sess.user = tempVar;
          res.redirect('/');
    });
});

// render the user page of the app
app.get('/userWall', stormpath.getUser, function(req, res) {
        if (req.user) {
		res.render('pages/user', { user2 : req.user.email });
	}
	else if (req.session.user) {
	    res.render('pages/user', { user2 : req.session.user});
	}
	else {
		res.render('pages/user', { user2 : null });
	}
});

// render the add image page
app.get('/add', stormpath.getUser, function(req, res){
      if (req.user) {
		res.render('pages/add', { user2 : req.user.email });
	}
	else if (req.session.user) {
	    res.render('pages/add', { user2 : req.session.user});
	}
	else {
		res.render('pages/add', { user2 : null });
	}
});

// process the form data to add images to the database
app.get('/processData', stormpath.getUser, function(req, res){
    var email;
    if (req.user) {
        email = req.user.email;
    }
    else {
        email = req.session.user;
    }
  // insert the data into the database
  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    insertDocument(db, function() {
        db.close();
        res.redirect("/");
    }, req.query.title, req.query.url, email );
  });
});

// clear the session
app.get('/clearSession', function(req, res) {
    req.session.destroy(function(err) {
      // cannot access session here 
    });
    res.json({"data":"cleared"});
    
});

// render the my pins page
app.get('/myPins', stormpath.getUser, function(req, res){
      if (req.user) {
		res.render('pages/mypins', { user2 : req.user.email, name: req.user.email });
	}
	else if (req.session.user) {
	    res.render('pages/mypins', { user2 : req.session.user, name: req.session.user});
	}
	else {
		res.render('pages/mypins', { user2 : null, name: null });
	}
});

// render the my pins page
app.get('/getMyPins', stormpath.getUser, function(req, res){
      var email;
    if (req.user) {
        email = req.user.email;
    }
    else {
        email = req.session.user;
    }
  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    findUserImages(db, function(images) {
        db.close();
        res.json({"images":images});
    },email);
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
    //console.log("Inserted a document into the images collection.");
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
         //console.log(results);
         callback();
      }
   );
};

function getQueryVariable(variable, query) {
   var vars = query.split("&");
   for (var i=0;i<vars.length;i++) {
           var pair = vars[i].split("=");
           if(pair[0] == variable){return pair[1];}
   }
   return(false);
}