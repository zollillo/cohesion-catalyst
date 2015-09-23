(function() {
MetaCollection = new Mongo.Collection("metaCollection");

Meteor.methods({
  testCall: function(dummy) {
    function pausecomp(millis) {
      var date = new Date();
      var curDate = null;
      do { curDate = new Date(); }
      while(curDate-date < millis);
    }
    console.log("in testCall, isClient=" + Meteor.isClient);
    if (Meteor.isServer) {
      pausecomp(5000);
      console.log("server done counting!");
    } else {
      console.log("client simulation done without waiting");
    }
  },
  addMetaInfo : function(doc) {
    var metaDoc = MetaCollection.findOne({
      name: doc.name
    });
    // Is ID with such name already in collection?
    if (metaDoc) {
      console.log("New creator for MetaID ", metaDoc.name);
      // then add its creator to this ID
      MetaCollection.update(metaDoc._id, {
        $addToSet: {
          createdBy: doc.createdBy
        }
      }, errorFunc);
    } else {
      // ID with such name not yet in collection, so create new ID
      var id = {};
      id.name = doc.name;
      id.color = pickRandomColorClass();
      id.createdBy = [doc.createdBy];

      var newDocId = MetaCollection.insert(id, errorFunc);
      console.log("New MetaID ", doc.name);
      // return newDocId;
    }
  },
  deleteMetaInfo: function(doc) {
    var metaDoc = MetaCollection.findOne({
      name: doc.name
    });

    if (metaDoc.createdBy.length > 1) {
      MetaCollection.update(metaDoc._id, {
        $pull: {
          createdBy: doc.createdBy
        }
      }, errorFunc);
      console.log("Lost creator for MetaID ", metaDoc.name);
    } else {
      MetaCollection.remove(metaDoc._id, errorFunc);
      console.log("Remove MetaID ", metaDoc.name);
    }
  }
});
}()); // end function closure