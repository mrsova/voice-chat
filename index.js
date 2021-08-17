//const fs = require('fs');
const express = require('express');
const app = express();
let httpsServer = require('http').Server(app);
let io = require('socket.io')(httpsServer);

var port = 3000
var CircularJSON = require('circular-json');

var r = 'default'

app.get('/', function (request, response, next) {
    response.send(CircularJSON.stringify(io));
});


app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

io.on('connection', function (socket) {
    r = socket.handshake.query.room

    socket.join(r);

    //add name user
    socket.on('add nameuser', function (user) {
        room = {};
        for (key in io.sockets.adapter.rooms) {
            if (user.id === key) {
                io.sockets.adapter.rooms[key].name = user.name;
            }
        }
        for (key in io.sockets.adapter.rooms) {
            if (key === r) {
                var sockets = {};

                for (var k in io.sockets.adapter.rooms[key].sockets) {
                    sockets[k] = io.sockets.adapter.rooms[k].name;
                }
                room[key] = {
                    'sockets': sockets
                }
            }
        }
        //connect user
        io.to(r).emit('user joined',{
            socketId: socket.id,
            room: room,
            params: socket.handshake.query.room
        });
    });

    //client message
    socket.on('chat.message', function (message) {
        io.to(message.room).emit('chat.message', message.message);
    });

    //client sends user typing event server
    socket.on('user typing', function (username) {
        io.to(username.room).emit('user typing', username.id);
    });

    //clients stopped typing
    socket.on('stopped typing', function (username) {
        io.to(username.room).emit('stopped typing', username.id);
    });

    socket.on('disconnect', function () {
        console.log('User left: ' + socket.id);
        //disconnected
        socket.broadcast.emit('user left', socket.id);
    })
    socket.on('radio', function(blob) {
        // can choose to broadcast it to whoever you want
        socket.broadcast.emit('voice', blob);
    });
});


httpsServer.listen(port)
httpsServer.on('listening', function() {
    console.log('Express server started on port %s', httpsServer.address().port);
});