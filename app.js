const express = require("express");
const nconf = require("nconf");
const path = require("path");
const bodyParser = require("body-parser");
const Player = require("./player.js");
const socketio = require("socket.io");

nconf.argv().env().file("./config.json").defaults({
    port: 3000
});

// Setup express

let app = express();
let http = require("http").createServer(app);
let io = socketio(http);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

// Init player

let player = new Player();

// Player log output

player.on("start", () => console.log("Player started"));
player.on("stop", () => console.log("Player stopped"));
player.on("pause", () => console.log("Player paused"));
player.on("resume", () => console.log("Player resumed"));

player.on("songChanged", song => console.log("Current song: " +  (song ? song.name : "null")));
player.on("queueChanged", queue => console.log("Queue updated; length=" + queue.length));
player.on("volumeChanged", volume => console.log("Volume changed to " + volume * 100 + "%"));

// Application routes

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
        player.addSong(req.body.url, () => {
            res.json({ result: true });
            player.start();
        });
    } else
        res.json({ result: false, message: "No URL" });
});

app.post("/start", (req, res) => {
    player.start();
    res.json({ result: true });
});

app.post("/stop", (req, res) => {
    player.stop();
    res.json({ result: true });
});

app.post("/pause", (req, res) => {
    player.pause();
    res.json({ result: true });
});

app.post("/next", (req, res) => {
    player.next();
    res.json({ result: true });
});

app.get("/volume", (req, res) => {
    res.json(player.volume);
});

app.post("/volume", (req, res) => {
    if (req.body.volume) {
        player.volume = req.body.volume;
        res.json({ result: true });
    } else
        res.json({ result: false, message: "No volume" });
});

app.delete("/queue/:itemIndex", (req, res) => {
    if (player.queue.length > req.params.itemIndex) {
        player.removeFromQueue(req.params.itemIndex);
        res.json({ result: true });
    } else
        res.json({ result: false, message: "Index out of range: " + req.params.itemIndex });
});

// Socket.IO events

player.on("queueChanged", queue => io.emit("queueChanged", queue));
player.on("songChanged", song => io.emit("songChanged", song));
player.on("volumeChanged", volume => io.emit("volumeChanged", volume));

// Gogo
http.listen(nconf.get("port"), () => console.log("Listening on port " + nconf.get("port")));

// Debugging
// setInterval(() => console.log(player.getInfo()), 3000);