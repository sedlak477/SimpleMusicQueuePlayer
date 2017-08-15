const express = require("express");
const nconf = require("nconf");
const path = require("path");
const bodyParser = require("body-parser");
const Player = require("./player.js");
const socketio = require("socket.io");

nconf.argv().env().file("./config.json").defaults({
    port: 3000
});

let app = express();
let http = require("http").createServer(app);
let io = socketio(http);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

let player = new Player();

// Express routing

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "www/index.html"));
});

app.use("/", express.static("www"));

app.get("/queue", (req, res) => {
    /*
    Return format: [{
        name: string,
        url: string
    }]
    */
    res.json(player.queue);
});

app.get("/currentSong", (req, res) => {
    /*
    Return format: {
        name: string,
        url: string
    }
    */
    res.json(player.currentSong);
});

app.post("/addSong", (req, res) => {
    if (req.body.url) {
        player.addSong(req.body.url, queue => {
            res.json({ result: true });
            if (!player.playing)
                player.start();
        });
    } else
        res.json({ result: false, message: "No URL" });
});

app.post("/start", (req, res) => {
    if (!player.playing) {
        player.playing = true;
        res.json({ result: true });
    } else
        res.json({ result: false, message: "Already playing" });
});

app.post("/stop", (req, res) => {
    if (player.playing) {
        player.playing = false
        res.json({ result: true });
    } else
        res.json({ result: false, message: "Currently not playing" });
});

app.post("/pause", (req, res) => {
    if (player.playing) {
        player.playing = false;
        res.json({ result: true });
    } else
        res.json({ result: false, message: "Currently not playing" });
});

app.post("/setVolume", (req, res) => {
    if (req.body.volume) {
        player.volume = req.body.volume;
        res.json({ result: true });
    } else
        res.json({ result: false, message: "No volume" });
});

// Socket.IO events

player.on("queueChanged", queue => io.emit("queueChanged", queue));

player.on("songChanged", song => io.emit("songChanged", song));





// Gogo

http.listen(nconf.get("port"), () => console.log("Listening on port " + nconf.get("port")));