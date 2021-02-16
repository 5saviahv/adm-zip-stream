const zlib = require("zlib");

module.exports = class Inflater {
    constructor(/*Buffer*/ inbuf, /* object */ options) {
        this.databuf = inbuf;
    }
    inflate() {
        return zlib.inflateRawSync(this.databuf);
    }
    inflateAsync(/*Function*/ callback) {
        const stream = zlib.createInflateRaw(),
            parts = [];
        let total = 0;
        stream.on("data", function (data) {
            parts.push(data);
            total += data.length;
        });
        stream.on("end", function () {
            const buf = Buffer.alloc(total, 0);
            let written = 0;
            for (const part of parts) {
                part.copy(buf, written);
                written += part.length;
            }
            callback && callback(buf);
        });
        stream.end(this.databuf);
    }
};
