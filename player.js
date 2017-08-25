const ytdl = require("ytdl-core");
const Speaker = require("speaker");
const ffmpeg = require("fluent-ffmpeg");
const { EventEmitter } = require("events");
const lame = require("lame");

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
                this.queue.push({ name: info.title, url: url, pictureUrl: info.iurlmaxres, description: info.description });
                console.log("Song '" + info.title + "' added to queue");
                this.emit("queueChanged", this.queue);
            });
        }
    }

    /**
     * Start the player
     * @private
     */
    start() {
        if (this._corked) {
            this._streams.speaker.uncork();
            this._corked = false;
            this._playing = true;
            console.log("Player resumed");
            this.emit("resume");
        } else if (this.queue.length > 0 && !this.playing) {
            let song = this.queue.shift();
            this.emit("queueChanged", this.queue);

            this._streams.speaker = new Speaker();
            // Start next song
            this._streams.speaker.on("close", () => {
                if (this.playing) {
                    console.log("Finished song: " + this.currentSong.name);
                    this.emit("finished", this.currentSong);
                    this.next();
                }
            });
            this._streams.speaker.on("error", console.error);

            this._streams.lame = new lame.Decoder();
            this._streams.lame.on("error", console.error);
            this._streams.lame.pipe(this._streams.speaker);

            // Get youtube stream; use ffmpeg to convert to wav format; pipe into speakers
            this._streams.youtube = ytdl(song.url, { quality: "lowest" });

            // -ar 44100 sets output sample rate to 44100 Hz to match Speaker sample rate
            this._streams.ffmpeg = ffmpeg(this._streams.youtube).format("mp3").on("error", console.error).stream();
            this._streams.ffmpeg.pipe(this._streams.lame);

            this._playing = true;
            this.currentSong = song;
            console.log("Playing: " + song.name);
            this.emit("start", song);
        }
    }

    /**
     * Pause the playback
     */
    pause() {
        if (!this._corked) {
            this._streams.speaker.cork();
            this._corked = true;
            this._playing = false;
            console.log("Player paused");
            this.emit("pause");
        }
    }

    /**
     * Stop playback
     */
    stop() {
        if (this.playing) {
            if (this._streams.youtube) {
                this._streams.youtube.destroy();
                this._streams.youtube = null;
            }
            if (this._streams.ffmpeg) {
                this._streams.ffmpeg.destroy();
                this._streams.ffmpeg = null;
            }
            if (this._streams.lame) {
                this._streams.lame = null;
            }
            if (this._streams.speaker) {
                this._streams.speaker.destroy();
                this._streams.speaker = null;
            }
            this._playing = false;
            this._corked = false;
            this.currentSong = null;
            this.emit("stop");
        }
    }

    /**
     * Play next song
     */
    next() {
        if (this.playing) {
            this.stop();
            this.start();
        } else {
            this.queue.shift();
            this.emit("queueChanged", this.queue);
        }
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