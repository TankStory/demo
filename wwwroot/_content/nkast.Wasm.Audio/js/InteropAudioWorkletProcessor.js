class InteropAudioWorkletProcessor extends AudioWorkletProcessor {

    constructor(options) {
        super();

        this.uid = -1;
        this.keepAlive = true;
        this.buffers = [];
        this.currentBuffer = [];
        this.bufferIndex = 0;
        this.isEmpty = true;

        this.phase = 0;

        //console.log(options);
        //console.log(sampleRate);

        this.port.onmessage = event => {
            if (event.data.type === "uid") {
                this.uid = event.data.uid;
                //console.log(`processor > received uid ${this.uid}.`);
                return;
            }
            if (event.data.type === "s") {
                const buffer = new Float32Array(event.data.buffer);
                //console.log(`received buffer of length ${buffer.length}.`, buffer);
                this.buffers.push(buffer);
                this.isEmpty = false;
                //console.log(`processor > received buffer.  Buffer count: ${this.buffers.length}`);
                return;
            }
            if (event.data.type === "c") {
                console.log('processor > clear requested');
                this.buffers = [];
                this.isEmpty = true;
                return;
            }
            if (event.data.type === "q") {
                console.log('processor > quit requested');
                this.buffers = [];
                this.currentBuffer = [];
                this.bufferIndex = 0;
                this.isEmpty = true;
                this.keepAlive = false;
                return;
            }
        }

        this.port.onmessageerror = e => console.log(`processor ERROR > ${e.data}`, e);

        //console.log('processor > constructor completed');
    }

    tryDequeueBuffer() {
        const wasEmpty = this.isEmpty;
        this.isEmpty = this.buffers.length == 0;
        //console.log(`processor > tryDequeueBuffer > buff.len: ${this.buffers.length}, isEmpty : ${this.isEmpty})`);

        if (this.isEmpty && !wasEmpty) {
        //if (this.isEmpty) {
            console.warn('InteropAudioWorkletProcessor > no buffer to process.');
        }

        if (!this.isEmpty) {

            this.currentBuffer = this.buffers.shift();
            //console.log(`processor > dequeueing buffer. ${this.buffers.length} remaining.`);

            this.port.postMessage({ type: 'dq', remaining: this.buffers.length, uid: this.uid });

            return true;
        }

        return false;
    }

    process(inputs, outputs, parameters) {
        //console.log("processor > process called");
        //console.log("processor > keepAlive", this.keepAlive);
        //console.log("processor > this.currentBuffer.length", this.currentBuffer.length);

        if (this.uid == -1) {
            //console.warn('processor > uid not set, returning keepAlive', this.keepAlive);
            return this.keepAlive;
        }

        if (this.currentBuffer.length == 0 && !this.tryDequeueBuffer()) {
            //console.log('processor > no buffer to process, returning keepAlive', this.keepAlive);
            return this.keepAlive;
        }

        const sampleCount = outputs[0][0].length;

        //console.log("processor hummm", sampleCount);

        for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
            //const highByte = this.currentBuffer[this.bufferIndex++];
            //const lowByte = this.currentBuffer[this.bufferIndex++];
            //const sample = (((highByte << 8) | lowByte) / 32768.0) - 1;

            //this.bufferIndex++;
            //const lowByte = this.currentBuffer[this.bufferIndex++];
            //const sample = lowByte / 128.0;

            const sample = this.currentBuffer[this.bufferIndex++];

            //const period = 360;
            //const sample = Math.sin(2 * Math.PI * this.phase / period) - 1; // normalized to [-0.5, 0.5]
            //this.phase = (this.phase + 1) % period;

            for (let outputIndex = 0; outputIndex < outputs.length; outputIndex++) {
                for (let channelIndex = 0; channelIndex < outputs[outputIndex].length; channelIndex++) {
                    outputs[outputIndex][channelIndex][sampleIndex] = sample;
                }
            }

            if (this.bufferIndex >= this.currentBuffer.length) {
                this.bufferIndex = 0;

                if (!this.tryDequeueBuffer()) {
                    break;
                }
            }
        }

        //console.log('dooted');
        return this.keepAlive;
    }
}

registerProcessor("interop-audio-worklet-processor", InteropAudioWorkletProcessor);