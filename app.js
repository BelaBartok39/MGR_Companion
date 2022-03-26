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
const encrypt = require("mongoose-encryption");
const md5 = require("md5");



// MONGO CONNECTION //
// This is the connection to the database. 27017 is the port mongo chooses by default

mongoose.connect(process.env.DB_CONNECT)
console.log("DB CONNECTION SUCCESSFUL")


// EE TABLE //
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


// Adding database encryption to only the password field//
const secret = process.env.DB_ENCRYPTION;
userSchema.plugin(encrypt, {secret: secret, encryptedFields:["password"]});



// This initializes a new schema or what Mongo calls a collection. Each collection
// is essentially the equivalent of a table in SQL

const Item = mongoose.model("Item", itemsSchema);
const List = mongoose.model("List", listSchema);
const User = mongoose.model("User", userSchema);



// Write now the app starts with items by default. These are them. They can be deleted
// easily by checking the box in the app. I'm sure there is a better way to do this.

const item1 = new Item({
  item: "Welcome to Fedex Staffing Beta!",
});


// Just a default list I use to call when a new page is created.It just adds the
// three items above.

const defaultItems = [item1];


////// BEGIN APP //////

// Intitalize date
const day = date.getDate();

// Initialize express
const app = express();


// Initialize ejs
app.set("view engine", "ejs");
app.use(express.static("public"));


// Intialize body parser.
// This allows you to access the text inside text forms on our pages
app.use(bodyParser.urlencoded({
  extended: true
}));


              ///////////// MAIN PAGE ////////////
app.get("/", function(req, res){
  res.render("home");
});


              ///////////// register ////////////
app.get("/register", function(req, res){
  res.render("register");
});

app.post("/register", function(req, res){
  const newUser = new User({
    email: req.body.username,
    password: md5(req.body.password)
  });
  newUser.save(function(err){
    if (err){
      console.log(err)
    } else {
      res.render("main")
    };
  });
});


              ///////////// login //////////////
app.get("/login", function(req, res){
  res.render("login");
})

app.post("/login", function(req, res){
  const username = req.body.username;
  const password = md5(req.body.password);

  User.findOne({email: username}, function(err, foundUser){
    if (err){
      console.log(err);
    } else {
      if (foundUser) {
        if (foundUser.password === password){
          res.render("main");
        }
      }
    }
  });
});



              ///////////// staffing ///////////


// A GET call to retrieve all current items in the database, if there are less
// than zero then it adds back the default items listed below

app.get("/staffing", function(req, res) {

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
});

// A POST call to add items to the list and the database
app.post("/", function(req, res) {


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


// This delete route for when you check a checkbox, it then deletes the thing. Not sure
// if I have hooked this up to the database yet. It renders it deleted on the screen for now.

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
