"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nx_socket_1 = __importDefault(require("./socket/nx_socket"));
const socket_io_1 = require("socket.io");
const node_fs_1 = __importDefault(require("node:fs"));
const node_domain_1 = __importDefault(require("node:domain"));
let server = new socket_io_1.Server({
    maxHttpBufferSize: 1e8 // 100 MB
});
let nxsocket = new nx_socket_1.default();
let args = process.argv;
function main() {
    if (args.length >= 4) {
        if (args[3] == 'true') {
            nxsocket.startServer();
        }
        if (args[2] == 'remote') {
            console.log('Waiting for connection...');
            const d = node_domain_1.default.create();
            nxsocket.startServer((msg) => server.emit('log', msg));
            server.on('connection', (socket) => {
                let metadata = {
                    name: 'None.nro',
                    size: 0
                };
                socket.on('metadata', (data) => (metadata = data));
                socket.on('file', (chunk) => {
                    d.run(() => {
                        nxsocket.sendNRO(metadata.name, chunk, metadata.size);
                    });
                });
                d.on('error', (domainErr) => {
                    socket.emit("error", "Failed to connect to the Nintendo Switch.");
                });
                console.log('Connection established with nxclient');
            });
            server.listen(9999);
            console.log("Listening on port 9999");
        }
        else {
            let fileName = args[2];
            if (!node_fs_1.default.existsSync(fileName)) {
                console.error(`File ${fileName} does not exist`);
                return;
            }
            let fileData = node_fs_1.default.readFileSync(fileName);
            nxsocket.sendNRO(fileName, fileData, fileData.length);
        }
    }
}
main();
