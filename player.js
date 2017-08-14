const ytdl = require("ytdl-core");
const Speaker = require("speaker");
const ffmpeg = require("fluent-ffmpeg");
const { EventEmitter } = require("events");

class Player extends EventEmitter {

    /**
     * A callback handler only accepting an error
     * @callback emptyCallback
     * @param {*} [error]
     */

    /**
     * A simple music player, playing YouTube videos to speakers
     */
    constructor() {
        super();

        /**
         * Music queue of the bot
         * @type {string[]}
         */
        this.queue = [];

        /**
         * Current play status of the player
         * @type {boolean}
         * @private
         */
        this._playing = false;

        /**
         * The currently played song
         * @type {object}
         * @private
         */
        this._currentSong = null;

        /**
         * Current volume
         * @type {number}
         * @private
         */
        this._volume = 0.7;

        /**
         * Contains various streams for playnig audio
         * @type {object}
         * @private
         */
        this._streams = {}

    }

    /**
     * Current play status
     */
    get playing() {
        return this._playing;
    }

    /**
     * Set playing state of player
     * @param {boolean} value
     */
    set playing(value) {
        this._playing = value;
        if (value) {
            this.start();
            console.log("Player started");
            this.emit("start", this.currentSong);
        } else {
            if (this._corked) {
                this._streams.speaker.cork();
                console.log("Player paused");
                this.emit("pause");
            }
        }
    }

    /**
     * Current song
     * @returns {object} Object containing url and name 
     */
    get currentSong() {
        return this._currentSong;
    }

    /**
     * @private
     */
    set currentSong(value) {
        this._currentSong = value;
        this.emit("songChanged", value);
    }

    /**
     * Current volume
     */
    get volume() {
        return this._volume;
    }

    /**
     * Current volume
     */
    set volume(value) {
        this._volume = value;
        if (this._streams.volume)
            this._streams.volume.setVolume(value);
        this.emit("volumeChanged", value);
    }

    /**
     * Add song to queue, currently only accepts YouTube URLs
     * @param {string} url URL to song
     * @param {emptyCallback} callback Called after song got added to the queue callback
     */
    addSong(url, callback) {
        if (true || ytdl.validateLink(url)) {  // Worst fix in history
            this.once("queueChanged", callback);
            ytdl.getInfo(url).then(info => {
                this.queue.push({ name: info.title, url: url });
                console.log("Song '" + info.title + "' added to queue");
                this.emit("queueChanged", this.queue);
            });
        }
    }

    /**
     * Start the player
     */
    start() {
        if (this._corked) {
            this._streams.speaker.uncork();
        } else if (this.queue.length > 0 && !this.playing) {
            let song = this.queue.pop();
            this.emit("queueChanged", this.queue);
            this._streams.speaker = new Speaker();
            // Start next song
            this._streams.speaker.on("close", () => {
                this.playing = false;
                this.currentSong = null;
                this.emit("end");
                this.start();
            });
            // Get youtube stream; use ffmpeg to convert to wav format; pipe into speakers
            this._streams.youtube = ytdl(song.url, { quality: "lowest" });
            this._streams.ffmpeg = ffmpeg(this._streams.youtube).format("wav").stream();
            this._streams.ffmpeg.pipe(this._streams.speaker);
            this._playing = true;
            this._currentSong = song;
            console.log("Playing: " + song.name);
            this.emit("start", song);
        }
    }
}

module.exports = Player;