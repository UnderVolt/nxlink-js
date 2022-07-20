import NXSocket from './socket/nx_socket';
import { Server } from 'socket.io';
import fs from 'node:fs';
import domain from 'node:domain';

let server = new Server({
    maxHttpBufferSize: 1e8 // 100 MB
});

let nxsocket = new NXSocket();
let args = process.argv;

function main() {
    if(args.length >= 4){
        if(args[3] == 'true') {
            nxsocket.startServer();
        }
        if(args[2] == 'remote') {
            console.log('Waiting for connection...');
            const d = domain.create();
            nxsocket.startServer((msg: string) => server.emit('log', msg));
            server.on('connection', (socket) => {

                let metadata = {
                    name: 'None.nro',
                    size: 0
                };
                socket.on('metadata', (data) => (metadata = data))
                socket.on('file', (chunk) => {
                    d.run(() => {
                        nxsocket.sendNRO(metadata.name, chunk as Buffer, metadata.size);
                    })
                })

                d.on('error', (domainErr) => {
                    socket.emit("error", "Failed to connect to the Nintendo Switch.");
                });

                console.log('Connection established with nxclient');
            })

            server.listen(9999);
            console.log("Listening on port 9999");
        } else {
            let fileName = args[2];
            if(!fs.existsSync(fileName)) {
                console.error(`File ${fileName} does not exist`);
                return;
            }
            let fileData = fs.readFileSync(fileName);
            nxsocket.sendNRO(fileName, fileData, fileData.length);
        }
    }
}

main();