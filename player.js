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
        if (value === this._playing) return;
        if (value)
            this._start();
        else if (!this._corked) {
            this._streams.speaker.cork();
            this._corked = true;
            console.log("Player paused");
            this.emit("pause");
        }
        this._playing = value;
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
                console.log(info);
                this.queue.push({ name: info.title, url: url });
                console.log("Song '" + info.title + "' added to queue");
                this.emit("queueChanged", this.queue);
            });
        }
    }

    /**
     * Start the player
     * @private
     */
    _start() {
        if (this._corked) {
            this._streams.speaker.uncork();
            this._corked = false;
        } else if (this.queue.length > 0 && !this.playing) {
            let song = this.queue.pop();
            this.emit("queueChanged", this.queue);
            this._streams.speaker = new Speaker();
            // Start next song
            this._streams.speaker.on("close", () => {
                console.log("Finished song: " + this.currentSong.name);
                this._playing = false;
                this._corked = false;
                this.currentSong = null;
                this.playing = true;
            });
            this._streams.speaker.on("error", console.error);

            // Debugging

            this._streams.speaker.on("drain", () => console.log("drain - " + Date.now()));
            this._streams.speaker.on("finish", data => console.log("finish: " + data));

            // END Debugging

            // Get youtube stream; use ffmpeg to convert to wav format; pipe into speakers
            this._streams.youtube = ytdl(song.url, { quality: "lowest" });
            // -ar 44100 sets output sample rate to 44100 Hz to match Speaker sample rate
            this._streams.ffmpeg = ffmpeg(this._streams.youtube).format("wav").outputOption("-ar 44100").on("error", console.error).stream();
            this._streams.ffmpeg.pipe(this._streams.speaker, { end: true });
            this._playing = true;
            this.currentSong = song;
            console.log("Playing: " + song.name);
            this.emit("start", song);
        }
    }
}

module.exports = Player;