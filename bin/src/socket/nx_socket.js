"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("module-alias/register");
const net = __importStar(require("node:net"));
const node_zlib_1 = __importDefault(require("node:zlib"));
class NXSocket {
    constructor() {
        this.client = new net.Socket();
        this.server = new net.Server();
        this.zlibChunkSize = 16 * 1024;
        this.currentState = 0;
    }
    sendNRO(filename, fileData = {}, fileSize = 0, remote = false) {
        this.client.connect({ host: "192.168.1.69", port: 28280 }, () => {
            // If there is no error, the server has accepted the request and created a new
            // socket dedicated to us.
            console.log('Connected to nintendo switch');
            // The client can now send data to the server by writing to its socket.
            this.sendInt32LE(filename.length);
            this.sendData(Buffer.from(filename));
            this.sendInt32LE(fileSize);
        });
        // The client can also receive data from the server by reading from its socket.
        this.client.on('data', (chunk) => {
            let response = chunk.readInt32LE(0);
            switch (this.currentState) {
                case 0:
                    if (response != 0) {
                        switch (response) {
                            case -1:
                                console.error("Failed to create file\n");
                                break;
                            case -2:
                                console.error("Insufficient space\n");
                                break;
                            case -3:
                                console.error("Insufficient memory\n");
                                break;
                        }
                        this.client.end();
                    }
                    console.log(`Sending ${filename}, ${fileSize} bytes`);
                    // Send fileData in zlib chunks
                    node_zlib_1.default.deflate(fileData, (err, buffer) => {
                        if (!err) {
                            for (let i = 0; i < buffer.length;) {
                                let chunkSize = Math.min(this.zlibChunkSize, buffer.length - i);
                                this.sendInt32LE(chunkSize);
                                this.sendData(buffer.slice(i, i + chunkSize));
                                i += this.zlibChunkSize;
                            }
                            this.currentState = 1;
                            this.sendCommandList([]);
                        }
                    });
                    break;
                case 1:
                    console.log("Application uploaded successfully");
                    break;
            }
        });
        this.client.on('end', () => { });
    }
    startServer(callback = undefined) {
        this.server.on('connection', (socket) => {
            socket.on('data', (chunk) => {
                (callback ? callback : process.stdout.write)(chunk.toString());
            });
            socket.on('end', () => {
                console.log('Closing connection with the nintendo switch.');
            });
            socket.on('error', function (err) { });
        });
        this.server.listen(28771, () => { });
    }
    sendCommandList(commands) {
        let size = commands.length;
        let buffer = Buffer.from(Uint8Array.from([size & 0xff, (size >> 8) & 0xff, (size >> 16) & 0xff, (size >> 24) & 0xff]));
        commands.forEach(cmd => {
            buffer = Buffer.concat([buffer, Buffer.from(cmd)]);
        });
        this.client.write(buffer);
    }
    sendInt32LE(size) {
        let sizeBytes = Uint8Array.from([size & 0xff, (size >> 8) & 0xff, (size >> 16) & 0xff, (size >> 24) & 0xff]);
        this.client.write(sizeBytes);
    }
    sendData(data) {
        this.client.write(data);
    }
}
exports.default = NXSocket;
