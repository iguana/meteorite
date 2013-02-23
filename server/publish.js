// Rooms -- {name: String}
Rooms = new Meteor.Collection("rooms");

// Publish complete set of rooms to all clients.
Meteor.publish('rooms', function () {
  return Rooms.find();
});


// Messages -- {text: String,
//           done: Boolean,
//           tags: [String, ...],
//           room_id: String,
//           timestamp: Number}
Messages = new Meteor.Collection("messages");

// Publish all items for requested room_id.
Meteor.publish('messages', function (room_id) {
  return Messages.find({room_id: room_id});
});

Meteor.publish("allUserData", function () {
  return Meteor.users.find({}, {fields: {'services': 1}});
});

