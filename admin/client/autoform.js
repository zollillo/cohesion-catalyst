// We define our client-side hooks and callbacks.
// cf. [as of 2016-04-08] https://github.com/aldeed/meteor-autoform/#callbackshooks
AutoForm.addHooks([
  "user-update",
  "user-change-password",
  "user-create-normal",
  "user-create-admin",
  "training-update",
  "training-create",
  "bullseye-user-presentation-update",
  "bullseye-user-view-update",
  "bullseye-user-speed-update"
], {
  beginSubmit: function() {
    $(".ui.button").addClass("disabled");
  },
  endSubmit: function() {
    $(".ui.button").removeClass("disabled");
  },
  onError: function(formType, error) {
    sAlert.error(error.message);
  }
});

AutoForm.addHooks([
  "user-create-normal",
  "user-create-admin"
], {
  onSuccess: function() {
    sAlert.success("New user successfully created.", {onRouteClose:false});
    Router.go("/users");
  }
});

AutoForm.hooks({
  "user-change-password": {
    onSuccess: function(formType, result) {
      sAlert.success("Password successfully changed.");
    }
  },
  "user-update": {
    onSuccess: function(formType, result) {
      sAlert.success("User data successfully upddated.", {onRouteClose: false});
      Router.go("/users");
    }
  }
});

AutoForm.addHooks([
  "bullseye-user-presentation-update",
  "bullseye-user-view-update",
  "bullseye-user-speed-update"
], {
  onSuccess: function(formType, result) {
    sAlert.success("Update succeeded.");
  }
});

AutoForm.hooks({
  "training-update": {
    onSuccess: function(formType, result) {
      sAlert.success("Training data successfully updated.", {onRouteClose: false});
      Router.go("/trainings");
    }
  },
  "training-create": {
    onSuccess: function(formType, result) {
      sAlert.success("New training successfully created.", {onRouteClose: false});
      Router.go("/trainings");
    }
  }
});
