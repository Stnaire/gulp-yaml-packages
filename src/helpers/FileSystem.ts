

namespace GP.Helpers {
    var fs = require('fs');
    var fspath = require('path');
    var jsYaml = require('js-yaml');

    export class FileSystem {
        /**
         * Test if a file exists.
         *
         * @param string path
         * @returns boolean
         */
        static fileExists(path: string): boolean {
            try {
                return fs.statSync(path).isFile();
            } catch (e) {
                return false;
            }
        }

        /**
         * Tests if a path point to a directory.
         *
         * @param string path
         * @returns boolean
         */
        static isDirectory(path: string): boolean {
            var stats = fs.lstatSync(path);
            return stats && stats.isDirectory();
        }

        /**
         * Get a file extension.
         *
         * @param string path
         * @returns string
         */
        static getExtension(path: string): string {
            var ext = fspath.extname(path).toLowerCase();
            return ext && ext[0] === '.' ? ext.substring(1) : ext;
        }

        /**
         * Ensure a path is absolute and optionally that the file exists.
         *
         * @param string  path
         * @param string  from
         * @param boolean ensureExists
         * @returns string
         */
        static getAbsolutePath(path: string, from: string = '', ensureExists: boolean = false): string {
            var resolved = fspath.resolve(from, path);
            return !ensureExists || FileSystem.fileExists(resolved) ? resolved : null;
        }

        /**
         * Synchronously reads the entire contents of a file.
         *
         * @param string path
         * @returns string
         */
        static getFileContent(path: string): string {
            if (FileSystem.fileExists(path)) {
                return fs.readFileSync(path, 'utf-8');
            }
            Log.error('File', Log.Colors.red(path), 'does not exist.');
            return null;
        }

        /**
         * Safely reads a YAML file, parse it and returns its content as an object.
         *
         * @param string path
         * @return object
         */
        static getYamlFileContent(path: string): Object {
            try {
                var content = FileSystem.getFileContent(path);
                if (content !== null) {
                    return jsYaml.safeLoad(content);
                }
            } catch (e) {
                Log.error(
                    'Failed to read YAML file', Log.Colors.magenta(path)+'.',
                    'Reason:', Log.Colors.red(e.toString())
                );
            }
            return null;
        }

        /**
         * Solve the relative path from from to to.
         *
         * @param string from
         * @param string to
         * @returns string
         */
        static getRelativePath(from: string, to: string) {
            return fspath.relative(from, to);
        }

        /**
         * Get the directory name of a path.
         *
         * @param string path
         * @returns string
         */
        static getDirectoryName(path: string) {
            return fspath.dirname(path);
        }

        /**
         * Gets the directory separator.
         *
         * @returns string
         */
        static get separator(): string {
            return fspath.sep;
        }
    }
}
