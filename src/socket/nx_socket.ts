import 'module-alias/register';
import * as net from 'node:net';
import zlib from 'node:zlib';

export default class NXSocket {

    client: net.Socket = new net.Socket();
    server: net.Server = new net.Server();
    zlibChunkSize: number = 16 * 1024;
    currentState: number = 0;

    sendNRO(filename: any, fileData: any = {}, fileSize: number = 0, remote: boolean = false) {
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

            switch(this.currentState){
                case 0:
                    if (response != 0) {
                        switch(response) {
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
                    zlib.deflate(fileData, (err, buffer) => {
                        if (!err) {
                            for(let i = 0; i < buffer.length;) {
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

        this.client.on('end', () => {});
    }

    startServer(callback: any | undefined = undefined) {
        this.server.on('connection', (socket) => {
            socket.on('data', (chunk) => {
                (callback ? callback : process.stdout.write)(chunk.toString());
            });

            socket.on('end', () => {
                console.log('Closing connection with the nintendo switch.');
            });

            socket.on('error', function(err) {});
        });

        this.server.listen(28771, () => {});
    }

    sendCommandList(commands: string[]){
        let size   = commands.length;
        let buffer = Buffer.from(Uint8Array.from([size & 0xff, (size >> 8) & 0xff, (size >> 16) & 0xff, (size >> 24) & 0xff]));

        commands.forEach(cmd => {
            buffer = Buffer.concat([buffer, Buffer.from(cmd)]);
        })

        this.client.write(buffer);
    }

    sendInt32LE(size: number) {
        let sizeBytes = Uint8Array.from([size & 0xff, (size >> 8) & 0xff, (size >> 16) & 0xff, (size >> 24) & 0xff]);
        this.client.write(sizeBytes);
    }

    sendData(data: Buffer) {
        this.client.write(data);
    }
}