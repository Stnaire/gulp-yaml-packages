
namespace GP {
    import Utils = GP.Helpers.Utils;
    import Log = GP.Helpers.Log;

    var gutil = require('gulp-util');
    var watch = require('gulp-watch');

    export class GulpFile {
        /**
         * Types of resources.
         */
        static ResourcesTypes: string[] = ['scripts', 'styles', 'misc'];

        /**
         * Available options:
         *
         * --env        : set the environment (if prod, files will be uglified).
         * --theme      : theme name that can be used by packages with dynamic theme support.
         * --verbose    : to get more feedback on what is happening during tasks execution.
         * --strict     : check that all 'standalone' packages define an output for each input.
         * --watch      : to watch for changes on files declared on the .yml and rerun tasks automatically.
         */
        public options: Options;

        /**
         * Registered tasks, indexed by type of resource (scripts, styles or misc).
         */
        protected tasks: {[key: string]: GulpTask[]};

        constructor(protected _gulp: any) {
            this.tasks = {};
            this.options = {
                env: gutil.env.env || 'dev',
                theme: gutil.env.theme || 'default',
                verbose: gutil.env.verbose !== undefined,
                strict: gutil.env.strict !== undefined,
                watch: gutil.env.watch !== undefined,
                debug: gutil.env.debug !== undefined
            };
            if (['dev', 'prod'].indexOf(this.options.env) < 0) {
                Log.warning(
                    'Invalid environment', "'"+Log.Colors.red(this.options.env)+"'.",
                    'Must be', "'"+Log.Colors.yellow('dev')+"'",
                    'or', "'"+Log.Colors.yellow('prod')+"'."
                );
                this.options.env = 'dev';
            }
            for (var i = 0; i < GulpFile.ResourcesTypes.length; ++i) {
                this.tasks[GulpFile.ResourcesTypes[i]] = [];
            }
        }

        /**
         * Take a path to a YAML configuration file and generates corresponding gulpfile tasks.
         * An array with the names of created tasks is then returned (that should be passed to gulp default task).
         *
         * @param string path
         * @returns string[]
         */
        public createTasks(path: string, processors: {[key: string]: (stream: any, options: any) => any}): string[] {
            var tasksNames: string[] = [];
            var packageFile = new PackageFile(path, this.options);
            var configuration = packageFile.getGulpfileConfiguration();
            if (configuration !== null) {
                for (var i = 0; i < configuration.packages.length; ++i) {
                    for (var pname in processors) {
                        if (processors.hasOwnProperty(pname)) {
                            configuration.processors.register(pname, processors[pname]);
                        }
                    }
                    for (var j = 0; j < GulpFile.ResourcesTypes.length; ++j) {
                        let rt = GulpFile.ResourcesTypes[j];
                        let conf:PackageInputOutputConfiguration[] =
                            Utils.ensureArray((<any>configuration).packages[i][rt]);
                        for (var k = 0; k < conf.length; ++k) {
                            let task: GulpTask = null;
                            switch (rt) {
                                case 'scripts': task = new ScriptsTask(this, rt, conf[k], configuration.processors); break;
                                case 'styles': task = new StylesTask(this, rt, conf[k], configuration.processors); break;
                                default: task = new MiscTask(this, rt, conf[k], configuration.processors); break;
                            }
                            this.tasks[rt].push(task);
                            this._gulp.task(task.getName(), (function (t:GulpTask) {
                                return function () {
                                    return t.execute();
                                };
                            })(task));
                            tasksNames.push(task.getName());
                        }
                    }
                }
                if (this.options.watch) {
                    Array.prototype.push.apply(tasksNames, this.createWatchTasks(configuration.packages));
                }
            }
            return tasksNames;
        }

        /**
         * Executes registered tasks.
         * If no type is given, all tasks will be executed.
         *
         * @param string|string[] available types: scripts, styles or misc
         */
        public executeTasks(type: string|string[] = null): void {
            var types = type === null ? Object.keys(this.tasks) : Utils.ensureArray(type);
            for (var i = 0; i < types.length; ++i) {
                let tasks = this.tasks[types[i]];
                if (Utils.isArray(tasks)) {
                    for (var j = 0; j < tasks.length; ++j) {
                        tasks[j].execute();
                    }
                }
            }
        }

        /**
         * Create tasks responsible for watching changes on input files.
         * This method generates a task for each type of resources.
         *
         * @param GulpfileTaskConfiguration[] packages
         * @returns string[] names of created tasks
         */
        protected createWatchTasks(packages: GulpfileTaskConfiguration[]): string[] {
            let files: {[key: string]: string[]} = {};
            let tasksNames: string[] = [];

            for (var i = 0; i < packages.length; ++i) {
                for (var j = 0; j < GulpFile.ResourcesTypes.length; ++j) {
                    let rt = GulpFile.ResourcesTypes[j];
                    let conf: PackageInputOutputConfiguration[] = Utils.ensureArray((<any>packages)[i][rt]);

                    files[rt] = Utils.ensureArray(files[rt]);
                    for (var k = 0; k < conf.length; ++k) {
                        for (var l = 0; l < conf[k].watch.length; ++l) {
                            files[rt].push(conf[k].watch[l].absolute);
                        }
                        for (var l = 0; l < conf[k].input.length; ++l) {
                            for (var m = 0; m < conf[k].input[l].files.length; ++m) {
                                let path = conf[k].input[l].files[m].absolute;
                                if (files[rt].indexOf(path) < 0) {
                                    if (this.options.verbose) {
                                        Log.info('Watching', "'" + Log.Colors.magenta(path) + "'");
                                    }
                                    files[rt].push(path);
                                }
                            }
                        }
                    }
                }
            }
            for (var type in files) {
                if (files.hasOwnProperty(type) && files[type].length > 0) {
                    let name = '_gyp_watch_'+type;
                    this._gulp.task(name, (function(that: GulpFile, rt: string, files: string[]) {
                        return function() {
                            watch(files, function(file: any) {
                                Log.info('Change on', "'" + Log.Colors.magenta(file.path) + "'");
                                that.executeTasks(rt);
                            });
                        };
                    })(this, type, files[type]));
                    tasksNames.push(name);
                }
            }
            return tasksNames;
        }

        /**
         * Gets the gulp instance created in the user's gulpfile.
         *
         * @returns any gulp instance
         */
        get gulp(): any {
            return this._gulp;
        }
    }

    /**
     * Entry point of the module.
     *
     * @param string path       path to the YAML file to generate gulp tasks for
     * @param object gulp       the instance of gulp returned by calling "require('gulp')" in the gulpfile.js
     * @param object processors a key/value pair like 'processorName => processorFunc()'
     *                          to add custom processors or override internal ones.
     * @returns string[] created tasks' names
     */
    module.exports.load = function(path: string, gulp: any,
                                   processors: {[key: string]: (stream: any, options: any) => any} = {}): string[] {
        try {
            var gulpfile = new GulpFile(gulp);
            return gulpfile.createTasks(path, processors);
        } catch (e) {
            if (e instanceof StopException){
                return [];
            }
            throw e;
        }
    };
}

