//
// This server will start a bash shell and expose it
// over socket.io to a browser. See ./term.html for the 
// client side.
// 

process.on('SIGINT', function() {
  console.log("Caught interrupt signal");
  process.exit();
});

process.on('uncaughtException', function(err) {
  console.log('Caught exception: ' + err);
});

var http  = require('http'),
    https = require('https'),
    url   = require('url'),
    path  = require('path'),
    fs    = require('fs'),
    sys   = require('sys'),
    util  = require('util'),
    spawn = require('child_process').spawn;

const { Server } = require("socket.io");

// Configurables
var port = 8080
var min_time_alive = 10800 // 3 hours
var rse = false // reverse shell enabled

// Initialize vars
var start_time = Date.now() / 1000
var formatted_time_left = "Determining uptime"
var story_output = 'Getting new Hacker News stories...';
var catfact_output = 'Getting random cat fact';

server = http.createServer(function(request, response){
  var uri = url.parse(request.url).pathname;
  if (uri === "/") {
    uri = "/ntg-frontend.html"
  }
  var filename = path.join(process.cwd(), uri);
  fs.exists(filename, function(exists) {
    if (!exists) {
      response.writeHead(404, {'Content-Type':'text/plain'});
      response.end("Can''t find it...");
    }
    fs.readFile(filename, 'binary',function(err, file){
      if (err) {
        response.writeHead(500, {'Content-Type':'text/plain'});
        response.end(err + "\n");
        return;
      }
      response.writeHead(200);
      response.write(file, 'binary');
      response.end();

    });
  });
});

const io = new Server(server);

io.on('connection', function(client){
  io.sockets.emit('hnstories', story_output);
  io.sockets.emit('catfact', catfact_output);
  io.sockets.emit('rse', rse);
  io.sockets.emit('timeleft', formatted_time_left);
  io.sockets.emit('network', JSON.stringify(get_internal_network()))
  client.on('message', function(data){
    sh.stdin.write(data+"\n");
    io.sockets.emit('stdout', Buffer.from("> "+data+"<span class='timestamp'> # " + getdate() + "</span>", "utf-8"));
  });
});

console.log('Starting server on port: ' + port)
server.listen(port);

var sh = spawn('bash');

sh.stdout.on('data', function(data) {
  io.sockets.emit("stdout", data);
});

sh.stderr.on('data', function(data) {
  io.sockets.emit("stdout", data);
});

sh.on('exit', function (code) {
  io.sockets.emit("exit", Buffer.from('** Shell exited: '+code+' **', "utf-8"));
});

var get_hn = function(){
  console.log('Getting HN new stories')
  https.request({ host: 'hacker-news.firebaseio.com', path: '/v0/newstories.json' }, function(response) {
    var topstories = ''

    response.on('data', function (chunk) {
      topstories += chunk;
    });

    response.on('end', function () {
      get_hn_stories(JSON.parse(topstories))
    });
  }).end();
}

var get_hn_stories = function(topstories) {
  var story_output = ''
  for(var i=0; i<5; i++) {
    storyid = topstories[i]
    https.request({ host: 'hacker-news.firebaseio.com', path: '/v0/item/'+storyid+'.json'}, function(response) {
      var story = '';
      response.on('data', function (chunk) {
        story += chunk;
      });

      response.on('end', function () {
        story = JSON.parse(story)
        story_output += story['id'] + ": " + story['title'] + "<br/>"
        io.sockets.emit('hnstories', story_output);
      });
    }).end();
  };
}

var get_catfact = function(){
  console.log('Getting random cat fact')
  https.request({ host: 'catfact.ninja', path: '/fact' }, function(response) {
    var catfact = ''

    response.on('data', function (chunk) {
      catfact += chunk;
    });

    response.on('end', function () {
      catfact_output = JSON.parse(catfact)['fact']
      io.sockets.emit('catfact', catfact_output);
    });
  }).end();
}

var update_time = function(){
  if(rse == true) {
    return
  }
  var time_delta = Date.now() / 1000 - start_time
  var time_left = min_time_alive - time_delta
  if(time_left <= 0) {
    formatted_time_left = "Reverse shell enabled";
    rse = true
    io.sockets.emit('rse', rse);
    io.sockets.emit('timeleft', formatted_time_left);
    console.log('Reverse shell enabled')
    return
  }
  var hours = String(Math.floor(time_left / 60 / 60)).padStart(2, '0')
  var minutes = String(Math.floor(time_left / 60) - (hours * 60)).padStart(2, '0')
  var seconds = String(Math.floor(time_left % 60)).padStart(2, '0')
  formatted_time_left = hours + ':' + minutes + ':' + seconds + " before reverse shell enabled...";
  io.sockets.emit('timeleft', formatted_time_left);
}

var get_internal_network = function() {
  var net = require("net"),
  cp = require("child_process"),
  sh = cp.spawn("/bin/sh", []);
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  const results = Object.create(null);
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        if (!results[name]) {
          results[name] = [];
        }
        results[name].push({'address': net.address, 'cidr': net.cidr});
      }
    }
  }
  return results
}

var getdate = function() {
  var currentdate = new Date(); 
  var datetime = currentdate.getFullYear() + "/"
    + (currentdate.getMonth()+1)  + "/" 
    + currentdate.getDate() + " @ "  
    + currentdate.getHours() + ":"  
    + currentdate.getMinutes() + ":" 
    + currentdate.getSeconds();
  return datetime
}

setInterval(get_hn, 10000)
setInterval(get_catfact, 20000)
setInterval(update_time, 1000)
