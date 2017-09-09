const Speaker = require("speaker");
const ffmpeg = require("fluent-ffmpeg");
const lame = require("lame");
const { EventEmitter } = require("events");
const mpg123 = require("node-mpg123-util");

class SpeakerPipeline extends EventEmitter {

    /**
     * Create a new SpeakerPipeline. A SpeakerPipeline plays a given ReadableStream to speakers.
     * @param {ReadableStream} input Readable stream which should be played. Can be in various formats
     */
    constructor(input) {
        super();
        /**
         * True if the playback is paused
         * @type {boolean}
         */
        this.paused = false;

        /**
         * Input stream
         * @private
         * @type {ReadableStream}
         */
        this._inputStream = input;

        /**
         * Speaker stream to play raw audio to speakers
         * @private
         */
        this._speaker = new Speaker();

        this._speaker.on("error", err => this.emit("error", err));
        this._speaker.on("close", () => {
            this.emit("finish");
            this.emit("close");
        });

        /**
         * Lame decoder to decode MP3 into raw audio data
         * @private
         */
        this._lame = new lame.Decoder();

        this._lame.on("error", err => this.emit("error", err));
        this._lame.pipe(this._speaker);

        /**
         * FFMPEG stream to convert input format to MP3
         * @private
         */
        this._ffmpeg = ffmpeg(this._inputStream).format("mp3").on("error", err => this.emit("error", err)).pipe(this._lame);
    }

    set volume(value) {
        mpg123.setVolume(this._lame.mh, value);
        this.emit("volumeChanged", value);
    }

    get volume() {
        return mpg123.getVolume(this._lame.mh);
    }

    /**
     * Pause playback
     */
    pause() {
        if (!this.paused) {
            this._speaker.cork();
            this.paused = true;
            this.emit("pause");
        }
    }

    /**
     * Resume playback
     */
    resume() {
        if (this.paused) {
            this._speaker.uncork();
            this.paused = false;
            this.emit("resume");
        }
    }

    /**
     * Stop playback and free resources
     */
    destroy() {
        this._speaker.removeAllListeners("close");
        this._speaker.destroy();
        this.emit("close");
    }
}

module.exports = SpeakerPipeline;