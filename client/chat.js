// Client-side JavaScript, bundled and sent to client.

// Define Minimongo collections to match server/publish.js.
Rooms = new Meteor.Collection("rooms");
Messages = new Meteor.Collection("messages");
var generateAnon = function() {
  var rn = md5(Meteor.uuid());
  return 'anon_' + rn.substr(0,6);
};

// ID of currently selected room
Session.set('room_id', null);

// Name of currently selected tag for filtering
Session.set('tag_filter', null);

// When adding tag to a message, ID of the message
Session.set('editing_addtag', null);

// When editing a room name, ID of the room
Session.set('editing_roomname', null);

// When editing message text, ID of the message
Session.set('editing_itemname', null);

//var author = Meteor.userId() != null ? Meteor.userId() : md5(Meteor.uuid());
Session.set('author', generateAnon());

// Subscribe to 'rooms' collection on startup.
// Select a room once data has arrived.
Meteor.subscribe('rooms', function () {
  if (!Session.get('room_id')) {
    var room = Rooms.findOne({}, {sort: {name: 1}});
    if (room)
      Router.setRoom(room._id);
  }
});

Meteor.subscribe('allUserData', function() {
});

// Always be subscribed to the messages for the selected room.
Meteor.autorun(function () {
  var room_id = Session.get('room_id');
  if (room_id)
    Meteor.subscribe('messages', room_id);
});


////////// Helpers for in-place editing //////////

// Returns an event map that handles the "escape" and "return" keys and
// "blur" events on a text input (given by selector) and interprets them
// as "ok" or "cancel".
var okCancelEvents = function (selector, callbacks) {
  var ok = callbacks.ok || function () {};
  var cancel = callbacks.cancel || function () {};

  var events = {};
  events['keyup '+selector+', keydown '+selector+', focusout '+selector] =
    function (evt) {
      if (evt.type === "keydown" && evt.which === 27) {
        // escape = cancel
        cancel.call(this, evt);

      } else if (evt.type === "keyup" && evt.which === 13 ||
                 evt.type === "focusout") {
        // blur/return/enter = ok/submit if non-empty
        var value = String(evt.target.value || "");
        if (value)
          ok.call(this, value, evt);
        else
          cancel.call(this, evt);
      }
    };
  return events;
};

var activateInput = function (input) {
  input.focus();
  input.select();
};

////////// Rooms //////////

Template.rooms.rooms = function () {
  return Rooms.find({}, {sort: {name: 1}});
};

Template.rooms.events({
  'mousedown .room': function (evt) { // select room
    Router.setRoom(this._id);
  },
  'click .room': function (evt) {
    // prevent clicks on <a> from refreshing the page.
    evt.preventDefault();
  },
  'dblclick .room': function (evt, tmpl) { // start editing room name
    Session.set('editing_roomname', this._id);
    Meteor.flush(); // force DOM redraw, so we can focus the edit field
    activateInput(tmpl.find("#room-name-input"));
  }
});

// Attach events to keydown, keyup, and blur on "New room" input box.
Template.rooms.events(okCancelEvents(
  '#new-room',
  {
    ok: function (text, evt) {
      var id = Rooms.insert({name: text});
      Router.setRoom(id);
      evt.target.value = "";
    }
  }));

Template.rooms.events(okCancelEvents(
  '#room-name-input',
  {
    ok: function (value) {
      Rooms.update(this._id, {$set: {name: value}});
      Session.set('editing_roomname', null);
    },
    cancel: function () {
      Session.set('editing_roomname', null);
    }
  }));

Template.rooms.selected = function () {
  return Session.equals('room_id', this._id) ? 'active' : '';
};

Template.rooms.name_class = function () {
  return this.name ? '' : 'empty';
};

Template.rooms.num_messages = function() {
  console.log(this);
  var messages = Messages.find({ room_id: this._id });

  if(messages) {
    return messages.count();
  } else {
    return 0;
  }
};

Template.rooms.editing = function () {
  return Session.equals('editing_roomname', this._id);
};

////////// Messages //////////

Template.messages.any_room_selected = function () {
  return !Session.equals('room_id', null);
};

Template.new_message.any_room_selected = Template.messages.any_room_selected;

Template.new_message.events(okCancelEvents(
  '#new-message',
  {
    ok: function (text, evt) {
      var tag = Session.get('tag_filter');
      var user = Meteor.user();
      var author = user != null ? user.profile.name : Session.get('author') ;
      var picture = null;
      if(user != null && user.services != null) {
        if(user.services.google != null) {
          picture = user.services.google.picture;
        }
        if(user.services.facebook != null) {
          picture = "http://graph.facebook.com/" + user.services.facebook.id + "/picture/?type=large";
        }
      }
      var itemId = Messages.insert({
        text: text,
        author: author,
        picture: picture,
        room_id: Session.get('room_id'),
        done: false,
        timestamp: (new Date()).getTime(),
        tags: tag ? [tag] : []
      });
      evt.target.value = '';
    }
  }));

Template.messages.messages = function () {
  // Determine which messages to display in main pane,
  // selected based on room_id and tag_filter.

  var room_id = Session.get('room_id');
  if (!room_id)
    return {};

  var sel = {room_id: room_id};
  var tag_filter = Session.get('tag_filter');
  if (tag_filter)
    sel.tags = tag_filter;

  return Messages.find(sel, {sort: {timestamp: -1}});
};

Template.message_item.tag_objs = function () {
  var message_id = this._id;
  return _.map(this.tags || [], function (tag) {
    return {message_id: message_id, tag: tag};
  });
};

Template.message_item.done_class = function () {
  return this.done ? 'done' : '';
};

Template.message_item.author = function() {
  return this.author;
};

Template.message_item.msgDate = function() {
  var dt = new Date(this.timestamp);
  return dt;
};

Template.message_item.user_image = function () { 

};

Template.message_item.itemId = function() {
  return this._id;
};

Template.message_item.done_checkbox = function () {
  return this.done ? 'checked="checked"' : '';
};

Template.message_item.editing = function () {
  return Session.equals('editing_itemname', this._id);
};

Template.message_item.adding_tag = function () {
  return Session.equals('editing_addtag', this._id);
};

Template.message_item.events({
  'click .check': function () {
    Messages.update(this._id, {$set: {done: !this.done}});
  },

  'click .destroy': function () {
    Messages.remove(this._id);
  },

  'click .addtag': function (evt, tmpl) {
    Session.set('editing_addtag', this._id);
    Meteor.flush(); // update DOM before focus
    activateInput(tmpl.find("#edittag-input"));
  },

  'dblclick .display .message-text': function (evt, tmpl) {
    Session.set('editing_itemname', this._id);
    Meteor.flush(); // update DOM before focus
    activateInput(tmpl.find("#message-input"));
  },

  'click .remove': function (evt) {
    var tag = this.tag;
    var id = this.message_id;

    evt.target.parentNode.style.opacity = 0;
    // wait for CSS animation to finish
    Meteor.setTimeout(function () {
      Messages.update({_id: id}, {$pull: {tags: tag}});
    }, 300);
  }
});

Template.message_item.events(okCancelEvents(
  '#message-input',
  {
    ok: function (value) {
      Messages.update(this._id, {$set: {text: value}});
      Session.set('editing_itemname', null);
    },
    cancel: function () {
      Session.set('editing_itemname', null);
    }
  }));

Template.message_item.events(okCancelEvents(
  '#edittag-input',
  {
    ok: function (value) {
      Messages.update(this._id, {$addToSet: {tags: value}});
      Session.set('editing_addtag', null);
    },
    cancel: function () {
      Session.set('editing_addtag', null);
    }
  }));

////////// Tag Filter //////////

// Pick out the unique tags from all messages in current room.
Template.tag_filter.tags = function () {
  var tag_infos = [];
  var total_count = 0;

  Messages.find({room_id: Session.get('room_id')}).forEach(function (message) {
    _.each(message.tags, function (tag) {
      var tag_info = _.find(tag_infos, function (x) { return x.tag === tag; });
      if (! tag_info)
        tag_infos.push({tag: tag, count: 1});
      else
        tag_info.count++;
    });
    total_count++;
  });

  tag_infos = _.sortBy(tag_infos, function (x) { return x.tag; });
  tag_infos.unshift({tag: null, count: total_count});

  return tag_infos;
};

Template.tag_filter.tag_text = function () {
  return this.tag || "All items";
};

Template.tag_filter.selected = function () {
  return Session.equals('tag_filter', this.tag) ? 'selected' : '';
};

Template.tag_filter.events({
  'mousedown .tag': function () {
    if (Session.equals('tag_filter', this.tag))
      Session.set('tag_filter', null);
    else
      Session.set('tag_filter', this.tag);
  }
});

////////// Tracking selected room in URL //////////

var MessagesRouter = Backbone.Router.extend({
  routes: {
    ":room_id": "main"
  },
  main: function (room_id) {
    Session.set("room_id", room_id);
    Session.set("tag_filter", null);
  },
  setRoom: function (room_id) {
    this.navigate(room_id, true);
  }
});

Router = new MessagesRouter;

Meteor.startup(function () {
  Backbone.history.start({pushState: true});
});
