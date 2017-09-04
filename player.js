const ytdl = require("ytdl-core");
const { EventEmitter } = require("events");
const SpeakerPipeline = require("./speakerPipeline.js");

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
         * @readonly
         */
        this.playing = false;

        /**
         * Current pause status
         * @type {boolean}
         * @readonly
         */
        this.paused = false;

        /**
         * The currently played song
         * @type {object}
         * @private
         */
        this._currentSong = null;

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
        return this._speakerPipeline ? this._speakerPipeline.volume : null;
    }

    /**
     * Current volume
     */
    set volume(value) {
        this._speakerPipeline.volume = value;
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
                this.queue.push({ name: info.title, url: url, pictureUrl: info.iurlmaxres, description: info.description });
                console.log("Song '" + info.title + "' added to queue");
                this.emit("queueChanged", this.queue);
            });
        }
    }

    /**
     * Start the player
     */
    start() {
        if (this.paused) {
            this._speakerPipeline.resume();
            this.paused = false;
            console.log("Player resumed");
        } else if (this.queue.length > 0) {
            let song = this.queue.shift();
            this.emit("queueChanged", this.queue);

            // Get youtube stream
            this._ytdl = ytdl(song.url, { quality: "lowest" });

            this._speakerPipeline = new SpeakerPipeline(this._ytdl);
            this.on("volumeChanged", volume => this.emit("volumeChanged", volume));
            this.emit("volumeChanged", this._speakerPipeline.volume);

            this._speakerPipeline.once("close", () => {
                if (this.playing) {
                    this.start();
                }
            });

            this.playing = true;
            this.currentSong = song;
            console.log("Playing: " + song.name);
            this.emit("start", song);
        } else if (this.playing) {
            this.playing = false;
            this.emit("stop");
        }
    }

    /**
     * Pause the playback
     */
    pause() {
        this._speakerPipeline.pause();
        this.paused = true;
        console.log("Player paused");
        this.emit("pause");
    }

    /**
     * Stop playback
     */
    stop() {
        if (this._ytdl) {
            this.playing = false;
            this._speakerPipeline.destroy();
            this._ytdl.destroy();
            this.currentSong = null;
            this.emit("stop");
        }
    }

    /**
     * Play next song
     */
    next() {
        if (this.playing) {
            this._speakerPipeline.destroy();
            this._ytdl.destroy();
        } else {
            this.queue.shift();
            this.emit("queueChanged", this.queue);
        }
    }

    /**
     * Get various information for debugging purposes
     * @returns {Object}
     */
    getInfo() {
        return {
            ytdlBuffer: this._ytdl ? this._ytdl._readableState.buffer : null
        };
    }

    /**
     * Remove an item from the playback queue
     * @param {number} index Index of item which is to be removed
     */
    removeFromQueue(index) {
        let elem = this.queue.splice(index, 1)[0];
        this.emit("queueChanged", this.queue);
        console.log("Song '" + elem.name + "' removed from queue");
    }
}

module.exports = Player;