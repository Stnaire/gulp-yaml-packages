/// <reference path="helpers/FileSystem.ts" />
/// <reference path="helpers/Utils.ts" />

namespace GP {
    import Utils = GP.Helpers.Utils;
    import FileSystem = GP.Helpers.FileSystem;

    let globby = require('globby');
    let merge = require('merge-stream');

    export class MiscTask extends GulpTask {
        /**
         * Gets the type of resources handled by the task.
         *
         * @returns string
         */
        protected getType(): string {
            return 'misc';
        }

        /**
         * See: GulpTask::createStream().
         *
         * @param {GulpfileInputConfiguration[]} inputs
         *
         * @returns object|null
         */
        protected createStream(inputs: GulpfileInputConfiguration[]): any {
            const stream: any = super.createStream(inputs);
            if (stream !== null) {
                return stream.pipe(this.gulpfile.gulp.dest(this.outputPath));
            }
            return null;
        }

        /**
         * Misc resources are special because a single file input may generate multiple
         * input/output configurations.
         *
         * Let's take an example. If you have a configuration like:
         *
         * misc:
         *   input: 'assets/images/**'
         *   output: 'public/images'
         *
         * This will copy every file in the 'assets/images' folder into 'public/images'.
         * But 'assets/images' may contain sub folders, and if so, they have to be kept!
         *
         * So the line "input: 'assets/images/**'" will generate as many input/output configurations
         * as there are sub folders when resolving the glob.
         *
         * It's a bit ugly but the fastest way to handle this without restructuring the whole GulpTask class is
         * to create sub tasks for each sub input/output pair.
         *
         * This method does exactly that.
         *
         * When a file generates a sub task, it is removed from the current task's input.
         */
        public execute(): any {
            let subTasks: GulpTask[] = [];
            let originalInputs: any = [];

            for (let i = 0; i < this.configuration.input.length; ++i) {
                for (let j = 0; j < this.configuration.input[i].files.length; ++j) {
                    let path = this.configuration.input[i].files[j];
                    if (path.isGlob && path.globBase) {
                        let indexed: {[key: string]: PackageInputOutputConfiguration} = {};
                        let files: string[] = globby.sync(path.absolute);
                        for (let k = 0; k < files.length; ++k) {
                            if (!FileSystem.isDirectory(files[k])) {
                                let relativeDir = FileSystem.getDirectoryName(files[k]).substring(path.globBase.length);
                                if (!Utils.isSet(indexed[relativeDir])) {
                                    let newInput = Utils.clone(this.configuration.input[i]);
                                    let newOutput = Utils.clone(this.configuration.output);

                                    newInput.files = [];
                                    newOutput.dev.absolute += relativeDir;
                                    newOutput.prod.absolute += relativeDir;
                                    indexed[relativeDir] = {watch: [], input: [newInput], output: newOutput};
                                }
                                indexed[relativeDir].input[0].files.push({
                                    packageId: path.packageId,
                                    original: files[k],
                                    absolute: files[k],
                                    extension: FileSystem.getExtension(files[k]),
                                    isGlob: false,
                                    globBase: ''
                                });
                            }
                        }
                        for (let p in indexed) {
                            if (indexed.hasOwnProperty(p)) {
                                subTasks.push(new MiscTask(this.gulpfile, this.packageName, indexed[p], this.processorsManager));
                            }
                        }
                        originalInputs.push(Utils.clone(this.configuration.input[i]));
                        this.configuration.input[i].files.splice(j--, 1);
                    }
                }
            }
            let stream: any = super.execute();
            this.configuration.input = originalInputs;
            for (let i = 0; i < subTasks.length; ++i) {
                const nextStream: any = subTasks[i].execute();
                if (nextStream !== null) {
                    stream = (stream !== null) ? merge(stream, nextStream) : nextStream;
                }
            }
            return stream;
        }
    }
}

