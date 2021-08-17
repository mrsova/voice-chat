const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
// var socket = io('http://127.0.0.1:3000', {query: "room="+urlParams.get('room')})
var socket = io('https://socket.local.dv', {query: "room="+urlParams.get('room')})
//var socket = io().connect('http://127.0.0.1:3000', {query: "room="+urlParams.get('room')});

const player = document.getElementById('player');

function in_array(what, where) {
    for (var i = 0; i < where.length; i++)
        if (what == where[i].id)
            return true;
    return false;
}

new Vue({
    el: '#app',
    data: {
        connectedUsers: [],
        messages: [],
        message: {
            'type': '',
            'action': '',
            'user': '',
            'text': '',
            'timestamp': '',
            'reg': false
        },
        room:'',
        areTyping: []
    },
    created: function () {
        //if server emits user joined, update connectedUsers array
        socket.on('user joined', function (response) {
            console.log(response);
            let data = response.room;
            let socketId = response.socketId
            for (key in data) {
                this.room = key;
                for (var k in data[key].sockets) {
                    if (!in_array(k, this.connectedUsers)) {
                        this.connectedUsers.push({id: k, name: data[key].sockets[k]});
                    }
                }
            }
            for (key in this.connectedUsers) {
                if (this.connectedUsers[key].id == socketId) {
                    var infoMsg = {
                        "type": "info",
                        "msg": "Пользователь " + this.connectedUsers[key].name + " Присоединился"
                    }
                    this.messages.push(infoMsg);
                }
            }

            navigator.mediaDevices.getUserMedia({audio: true})
                .then(stream => {
                    if (window.URL) {
                        player.srcObject = stream;
                    } else {
                        player.src = stream;
                    }

                    const options = {mimeType: 'audio/webm'};
                    const recordedChunks = [];
                    const mediaRecorder = new MediaRecorder(stream, options);

                    mediaRecorder.addEventListener('dataavailable', function(e) {
                        if (e.data.size > 0) recordedChunks.push(e.data);
                    });

                    mediaRecorder.addEventListener('stop', function() {
                        var blob = new Blob(recordedChunks, { 'type' : 'audio/ogg; codecs=opus' });
                        socket.emit('radio', blob);
                    });

                    // Start recording
                    mediaRecorder.start();

                    // Stop recording after 5 seconds and broadcast it to server
                    setTimeout(function() {
                        mediaRecorder.stop()
                        mediaRecorder.start();
                    }, 5000);

                })
                .catch(err => document.write(err));

        }.bind(this));

        socket.on('voice', function(arrayBuffer) {
            var blob = new Blob([arrayBuffer], { 'type' : 'audio/ogg; codecs=opus' });
            var audio = document.createElement('audio');
            audio.src = window.URL.createObjectURL(blob);
            audio.play();
        });

        //if caht.message update messages array
        socket.on('chat.message', function (message) {
            this.messages.push(message);
        }.bind(this));

        //server emit user typing
        socket.on('user typing', function (username) {
            this.areTyping.push(username);
        }.bind(this));

        //server emits stoped typing
        socket.on('stopped typing', function (username) {
            var index = this.areTyping.indexOf(username);
            if (index >= 0) {
                this.areTyping.splice(index, 1);
            }
        }.bind(this));


        //if server broadcast 'user left' remuve leaving users connected users
        socket.on('user left', function (socketId) {
            for (key in this.connectedUsers) {
                if (this.connectedUsers[key].id == socketId) {
                    var infoMsg = {
                        "type": "info",
                        "msg": "Пользователь " + this.connectedUsers[key].name + " покинул чат"

                    }
                    this.messages.push(infoMsg);
                    this.connectedUsers.splice(key, 1);
                }
            }

        }.bind(this));

        //document.getElementById('panB').scrollTop = 10000000000000; offsetHeight
    },
    methods: {
        send: function () {
            for (key in this.connectedUsers) {
                if (this.connectedUsers[key].id == socket.id) {
                    this.message.user = this.connectedUsers[key].name;
                }
            }
            this.message.type = "chat";
            lt = new Date();
            Hour = lt.getHours();
            Minutes = lt.getMinutes();
            this.message.timestamp = Hour + ':' + Minutes;
            socket.emit('chat.message', {message: this.message, room:this.room});
            this.message.type = '';
            this.message.user = '';
            this.message.text = '';
            this.message.timastamp = '';

            $("#messages").bind('DOMSubtreeModified', function () { // отслеживаем изменение содержимого блока
                document.getElementById('panB').scrollTop = 10000000000000000000000000;
            });
        },
        sendReg: function (res) {
            this.message.reg = true;
            socket.emit('add nameuser', {name: res.srcElement.elements.username.value, id: socket.id});
        },
        userIsTyping: function (username) {
            if (this.areTyping.indexOf(username) >= 0) {
                $('.pencil').animate({left: '-10px'}, 1000);
                $('.pencil').animate({left: '0px'}, 1000);
                return true;
            }
            return false;
        },
        usersAreTyping: function () {
            if (this.areTyping.indexOf(socket.id) <= -1) {
                this.areTyping.push(socket.id);
                socket.emit('user typing', {id:socket.id, room:this.room});
            }
        },
        stoppedTyping: function (keycode) {
            if (keycode == '13' || (keycode == '8' && this.message.text == '')) {
                var index = this.areTyping.indexOf(socket.id);
                if (index >= 0) {
                    this.areTyping.splice(index, 1);
                    socket.emit('stopped typing', {id:socket.id,room:this.room});
                }
            }
        },
        smile: function (event) {
            var val = $("#outMes").val();
            this.message.text = val + ' ' + event.srcElement.outerHTML + ' ';
        }

    }
});
