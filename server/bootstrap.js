// if the database is empty on server start, create some sample data.
Meteor.startup(function () {
  if(false) { // change to true to clean up rooms and messages
    Rooms.remove({});
    Messages.remove({});
  }
  if (Rooms.find().count() === 0) {
    var data = [
      {name: "JavaScript",
       contents: [
         ["Welcome to JavaScript Chat. This is an experimental system.", "Official"]
       ]
      },
      {name: "CSS",
       contents: [
         ["Welcome to CSS Chat. Sign in at the top right, if you like.", "Official"]
         ]
      },
      {name: "NSFW",
       contents: [
         ["Welcome to Experimental chat.", "Official"]
       ]
      }
    ];

    var timestamp = (new Date()).getTime();
    for (var i = 0; i < data.length; i++) {
      var room_id = Rooms.insert({name: data[i].name});
      for (var j = 0; j < data[i].contents.length; j++) {
        var info = data[i].contents[j];
        Messages.insert({room_id: room_id,
                      text: info[0],
                      author: 'Admin',
                      timestamp: timestamp,
                      tags: info.slice(1)});
        timestamp += 1; // ensure unique timestamp.
      }
    }
  }
});
