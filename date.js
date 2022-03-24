

// Bela, this function was used at one point to import the current date as a title.
// It is not currently exported to the app.js or list.ejs file. It is not in use at all
// but could come in handy later if we wanted to add the current date somewhere on the app.


exports.getDate = function() {
  const today = new Date();

  const options = {
    weekday: "long",
    day: "numeric",
    month: "long"
  };

  return today.toLocaleDateString("en-us", options);

};

exports.getDay = function() {
  const today = new Date();

  const options = {
    weekday: "long",
  };

  return today.toLocaleDateString("en-us", options);
};

console.log(module);
