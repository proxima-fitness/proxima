import { promises as fs } from 'node:fs';
import { exec as execCb } from 'node:child_process';
import { resolve } from 'node:path';

export function createSandbox({ workingDirectory }: { workingDirectory: string }): ISandbox {
    function resolvePath(p: string): string {
        return resolve(workingDirectory, p);
    }

    return {
        readFile(path, encoding) {
            return fs.readFile(resolvePath(path), encoding);
        },

        async readdir(path, opts) {
            const entries = await fs.readdir(resolvePath(path), opts);
            return entries.map((entry) => ({
                name: entry.name,
                isDirectory: () => entry.isDirectory(),
            }));
        },

        exec(command) {
            return new Promise((resolve, reject) => {
                execCb(command, { cwd: workingDirectory }, (error, stdout, stderr) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve({ stdout, stderr });
                });
            });
        },
    };
}
