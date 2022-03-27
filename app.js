// Bela these are the required frameworks in order to use this thing so far. You will
// need to install express, npm, mondoDB, and mongoose. I used the command line or terminal
// to do this, I'm sure you will too.
require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const date = require(__dirname + "/date.js");
const nodemailer = require("nodemailer");
const passport = require("passport");
const session = require("express-session");
const passportLocalMongoose = require("passport-local-mongoose");




                         ////// BEGIN APP //////

// Intitalize date
const day = date.getDate();

// Initialize express
const app = express();


// Intialize ejs and Session.
// Body parser allows you to access the text inside text forms on our pages
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: process.env.SESSION_KEY,
  resave: false,
  saveUninitialized: false
}));


// Initalize passport
app.use(passport.initialize());
app.use(passport.session());


                        // MONGO CONNECTION //
// This is the connection to the database. 27017 is the local port mongo chooses.
// unless you are connecting to the cloud cluster, which is the case right here.

mongoose.connect(process.env.DB_CONNECT)
console.log("DB CONNECTION SUCCESSFUL")


                //////////// MONGO DB SCHEMAS //////////////
// This is the employee default schema. Just a name.
const itemsSchema = new mongoose.Schema({
  item: String,
});

const listSchema = new mongoose.Schema({
  name: String,
  items: [itemsSchema]
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});


// Add passport plugin to user Schema
userSchema.plugin(passportLocalMongoose);

// This initializes a new schema or what Mongo calls a collection. Each collection
// is essentially the equivalent of a table in SQL

const Item = mongoose.model("Item", itemsSchema);
const List = mongoose.model("List", listSchema);
const User = new mongoose.model("User", userSchema);


// Create passport sessions
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});



// Write now the app starts with items by default. These are them. They can be deleted
// easily by checking the box in the app. I'm sure there is a better way to do this.

const item1 = new Item({
  item: "Welcome to Fedex Staffing Beta!",
});


// Just a default list I use to call when a new page is created.It just adds the
// three items above.

const defaultItems = [item1];








      //////////// splash home page (the very beginning) //////////////
app.get("/", function(req, res){
  res.render("home");
});


                      //////////// login //////////////
app.get("/login", function(req, res){
  res.render("login");
});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/main");
      });
    }
  });

});


                      //////////// register //////////////
app.get("/register", function(req, res){
  res.render("register");
});

app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/main");
      });
    }
  });

});


                      //////////// main //////////////
app.get("/main", function(req, res){
  User.find({"main": {$ne: null}}, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("main", {usersWithSecrets: foundUsers});
      }
    }
  });
});

                      //////////// logout //////////////
app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});


                      ///////////// staffing ///////////
// retrieve all current items in the database, if there are less
// than zero then it adds back the default items listed above

app.get("/staffing", function(req, res) {
  if (req.isAuthenticated()) {
  Item.find({}, function(err, foundItems) { //Item.find with an empty{} means get everything in the collection in Mongo speak

    if (foundItems.length === 0) {
      Item.insertMany(defaultItems, function(err) {
        if (err) {
          console.log(err);
        } else {
          console.log("Items successfully added.");
        }
      });
      res.redirect("/staffing");
    } else {
      res.render("list", {
        listTitle: day,
        newListItems: foundItems
      });
    };
  });
} else {
  res.redirect("/login");
}
});

// A POST call to add items to the list and the database
app.post("/staffing", function(req, res) {


  const itemName = req.body.newItem; // these are ejs commands telling the app to look
  const listName = req.body.list; // on the page and find whats in the text box

  const item = new Item({
    item: itemName
  });

  if (listName === day) {
    item.save();
    res.redirect("/staffing");
  } else {
    List.findOne({
      name: listName
    }, function(err, foundList) { // mongo command to look for item by name in the database
      foundList.items.push(item);
      foundList.save();
      res.redirect("/staffing" + listName);
    });
  };

});


// This delete route for when you check a checkbox, it then deletes from DB and page.

app.post("/delete", function(req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === day) {
    Item.findByIdAndRemove(checkedItemId, function(err) { //this is an example of a mongo database command
      if (!err) {
        console.log("Successfully deleted checked item")
        res.redirect("/staffing");
      };
    });
  } else {
    List.findOneAndUpdate({
      name: listName
    }, {
      $pull: {
        items: {
          _id: checkedItemId
        }
      }
    }, function(err, foundList) {
      if (!err) {
        res.redirect("/staffing" + listName);
      };
    });
  };

});

// initialize mail transport and login
app.post("/send", function(req, res) {
  const title = req.body.customName
  var transporter = nodemailer.createTransport({
    host: process.env.STR_HOST,
    port: 465,
    secure: true, // use SSL
    auth: {
      user: process.env.STR_USER,
      pass: process.env.STR_PASS
    }
  });


// Send email with nodemailer
  Item.find({}, function(err, foundItems) {

    const data = ejs.renderFile(__dirname + "/views/emailtemp.ejs", {
      newListItems: foundItems,
      listTitle: title,
      dateTitle: day
    }, function(err, data) {
      if (err) {
        console.log(err);
      } else {
        var mainOptions = {
          from: process.env.STR_USER,
          to: process.env.STR_NICK,
          subject: 'Fedex Staffing',
          html: data
        };
        console.log("html data ======================>", mainOptions);
        transporter.sendMail(mainOptions, function(err, info) {
          if (err) {
            console.log(err);
          } else {
            console.log('Message sent: ' + info.response);
          }
          res.render("back")
        });
      }

    });
  });
});
                              ///END STAFFING///

console.log(day)


// Bela this is the port that I use at home to load this app. You can use any number
// you like
app.listen(process.env.PORT || 3000, function() {
  console.log("Server is Flying");
});
///////////////////////////////END PROGRAM///////////////////////////////////////
