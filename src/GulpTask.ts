
namespace GP {
    import FileSystem = GP.Helpers.FileSystem;
    import Utils = GP.Helpers.Utils;
    import Log = GP.Helpers.Log;

    var globby = require('globby');
    var streamqueue = require('streamqueue');
    var maxId = 0;

    export abstract class GulpTask {
        /**
         * Name of the task.
         */
        protected name: string;

        /**
         * Final output path.
         * A gulp.dest() will be done using it.
         */
        protected outputPath: string;

        constructor(protected gulpfile: GulpFile,
                    protected packageName: string,
                    protected configuration: PackageInputOutputConfiguration,
                    protected processorsManager: ProcessorsManager) {
            this.name = '_gyp_'+packageName+'_'+this.getType()+'_'+(++maxId);
            this.outputPath = (<any>this.configuration).output[this.gulpfile.options.env].absolute;
        }

        /**
         * Gets the type of resources handled by the task.
         * Override this in subclasses.
         *
         * @returns string
         */
        protected abstract getType(): string;

        /**
         * Gets the name of the task.
         *
         * @returns string
         */
        public getName(): string {
            return this.name;
        }

        /**
         * Executes the task.
         */
        public execute(): any {
            return this.createStream(this.prepareInputs());
        }

        /**
         * Do the 'gulp work', create a stream for each input, execute its processors and merge everything together.
         *
         * @param GulpfileInputConfiguration[] inputs
         * @returns object
         */
        protected createStream(inputs: GulpfileInputConfiguration[]): any {
            var queue: any = [];
            for (var i = 0; i < inputs.length; ++i) {
                let stream: any = this.gulpfile.gulp.src(inputs[i].files);
                let processors: any = [];

                if (this.gulpfile.options.verbose) {
                    Log.info(Log.Colors.green('New stream'));
                    for (var j = 0; j < inputs[i].files.length; ++j) {
                        Log.info('File', "'" + Log.Colors.yellow(inputs[i].files[j]) + "'");
                    }
                }
                if (inputs[i].processors !== null) {
                    for (var cname in inputs[i].processors.processors) {
                        if (inputs[i].processors.processors.hasOwnProperty(cname)) {
                            processors.push({
                                callback: cname,
                                options: (<any>inputs)[i].processors.processors[cname]
                            });
                        }
                    }
                    processors.sort((a:PackageFileProcessorConfiguration, b:PackageFileProcessorConfiguration) => {
                        return inputs[i].processors.executionOrder.indexOf(a.name) - inputs[i].processors.executionOrder.indexOf(b.name);
                    });
                    for (var j = 0; j < processors.length; ++j) {
                        if (this.gulpfile.options.verbose) {
                            Log.info(
                                'Processor', "'" + Log.Colors.yellow(processors[j].callback) + "'",
                                'options', "'" + Log.Colors.magenta(JSON.stringify(processors[j].options)) + "'"
                            );
                        }
                        stream = this.processorsManager.execute(processors[j].callback, processors[j].options, stream);
                        if (!Utils.isObject(stream)) {
                            Log.fatal(
                                'Invalid return value', "'" + Log.Colors.red(Utils.asString(stream)) + "'.",
                                'A processor must return a stream.'
                            );
                        }
                    }
                } else if (this.gulpfile.options.verbose) {
                    Log.info(Log.Colors.yellow('No processor'));
                }
                queue.push(stream);
            }
            return streamqueue.obj.apply(this, queue);
        }

        /**
         * Creates a new set of inputs using the configuration.
         * Resolves globs and group files with the same processors together.
         *
         * @returns GulpfileInputConfiguration[]
         */
        private prepareInputs(): any {
            var inputs: GulpfileInputConfiguration[] = [];
            var currentInput: GulpfileInputConfiguration = {files: [], processors: null};

            for (var i = 0; i < this.configuration.input.length; ++i) {
                for (var j = 0; j < this.configuration.input[i].files.length; ++j) {
                    let path = this.configuration.input[i].files[j];
                    let files: string[] = path.isGlob ? globby.sync(path.absolute) : [path.absolute];
                    for (var k = 0; k < files.length; ++k) {
                        if (FileSystem.fileExists(files[k])) {
                            let resolvedConfiguration = this.processorsManager.resolve(
                                files[k], path.packageId, this.configuration.input[i].processors
                            );
                            if (this.processorsManager.equals(currentInput.processors, resolvedConfiguration)) {
                                currentInput.files.push(files[k]);
                            } else {
                                if (currentInput.files.length) {
                                    inputs.push(currentInput);
                                }
                                currentInput = {files: [files[k]], processors: resolvedConfiguration};
                            }
                        } else if (!path.isGlob || !FileSystem.isDirectory(files[k])) {
                            Log.warning('File', "'" + Log.Colors.red(files[k]) + "'", 'not found.');
                        }
                    }
                }
            }
            if (currentInput.files.length) {
                inputs.push(currentInput);
            }
            return inputs;
        }
    }
}

