// Use the current path and one or more named routes to set an active class on the navigation items.
// cf. Greif S., Coleman T.: Discover Meteor. Pages 249-252.
Template.navigation.helpers({
  activeRouteClass: function(/* route names */) {
    // Convert the 'arguments' object to a regular JavaScript array
    var args = Array.prototype.slice.call(arguments, 0);
    // and then call 'pop()' on it to get rid of the hash added at the end by Spacebars
    args.pop();

    // For each navigation item take the list of route names and then use Underscore's 'any()' function
    // to see if any of the routes' corresponding URL is equal to the current path.
    // If any of the routes match up with the current path, 'any()' will return true.
    var active = _.any(args, function(name) {
      return Router.current() && Router.current().route && Router.current().route.getName() === name;
    });

    // Use the 'boolean && string' JavaScript pattern, where 'false && myString' returns 'false'
    // but 'true && myString' returns 'myString'.
    return active && "active";
  },
  username: function() {
    return Meteor.user().profile.name;
  },
  avatar: function() {
    return Meteor.user().profile.avatar;
  }
});

Template.navigation.events({
  "click .logout": function(event) {
    event.preventDefault();
    // The Meteor.logout() function is provided by the 'accounts-password' package.
    Meteor.logout();
    // We want to cancel the repeating logging if a user logs out.2
    var interval = Session.get("logInterval");
    if (interval) {
      Meteor.clearInterval(interval);
    }
    Router.go("home");
  },
  "click .disabled": function(event) {
    event.preventDefault();
    throwError("Please choose your smiley.");
    return false;
  },
  "click #reflect-link": function(event) {
    clientLogger.logInfo({
      trainingID: Meteor.user().profile.currentTraining,
      userID: Meteor.userId(),
      username: Meteor.user().profile.name,
      view: mapRouteName(),
      action: "ROUTED",
      target: "Reflect path"
    });
  },
  "click #match-link": function(event) {
    clientLogger.logInfo({
      trainingID: Meteor.user().profile.currentTraining,
      userID: Meteor.userId(),
      username: Meteor.user().profile.name,
      view: mapRouteName(),
      action: "ROUTED",
      target: "Match path"
    });
  },
  "click #explore-link": function(event) {
    clientLogger.logInfo({
      trainingID: Meteor.user().profile.currentTraining,
      userID: Meteor.userId(),
      username: Meteor.user().profile.name,
      view: mapRouteName(),
      action: "ROUTED",
      target: "Explore path"
    });
  }

});

/**
 * Helper function to map a route name to a screen/view name.
 * Used for logging the correct names.
 */
function mapRouteName() {
  var nameMap = {
    myIds: "Reflect",
    idPool: "Match",
    idNetwork: "Explore"
  };
  var name = Router.current() && Router.current().route && Router.current().route.getName();
  return nameMap[name];
}