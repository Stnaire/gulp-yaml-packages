/// <reference path="helpers/Utils.ts" />
/// <reference path="helpers/Log.ts" />

namespace GP {
    import Utils = GP.Helpers.Utils;
    import Log = GP.Helpers.Log;

    const gutil = require('gulp-util');
    const watch = require('gulp-watch');
    const crypto = require('crypto');

    let gulpfile: GulpFile = null;

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
         * Registered tasks.
         */
        private tasks: { [key: string]: { series: { [key: string]: GulpTask[] }, parallel: { [key: string]: string[] } } };

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
                    'Invalid environment', "'" + Log.Colors.red(this.options.env) + "'.",
                    'Must be', "'" + Log.Colors.yellow('dev') + "'",
                    'or', "'" + Log.Colors.yellow('prod') + "'."
                );
                this.options.env = 'dev';
            }
        }

        /**
         * Gets the gulp instance created in the user's gulpfile.
         *
         * @returns any gulp instance
         */
        get gulp(): any {
            return this._gulp;
        }

        /**
         * Take a path to a YAML configuration file and generates corresponding gulpfile tasks.
         * An array with the names of created tasks is then returned (that should be passed to gulp default task).
         *
         * @param {string} path
         * @param {object} processors
         *
         * @returns string[]
         */
        public createTasks(path: string, processors: { [key: string]: (stream: any, options: any) => any }): string[] {
            return this.createTasksForSeries(path, processors).concat(this.createTasksForParallel(path, processors));
        }

        /**
         * Take a path to a YAML configuration file and generates corresponding gulpfile tasks that needs to be executed in series.
         *
         * @param {string} path
         * @param {object} processors
         *
         * @returns string[]
         */
        public createTasksForSeries(path: string, processors: { [key: string]: (stream: any, options: any) => any }): string[] {
            const tasksNames: string[] = [];
            const hash: string = this.generateTasksForPath(path, processors);
            for (const resourceType in this.tasks[hash].series) {
                if (this.tasks[hash].series.hasOwnProperty(resourceType)) {
                    for (const task of this.tasks[hash].series[resourceType]) {
                        tasksNames.push(task.getName());
                    }
                }
            }
            return tasksNames;
        }

        /**
         * Take a path to a YAML configuration file and generates corresponding gulpfile tasks that needs to be executed in parallel.
         *
         * @param {string} path
         * @param {object} processors
         *
         * @returns string[]
         */
        public createTasksForParallel(path: string, processors: { [key: string]: (stream: any, options: any) => any }): string[] {
            let tasksNames: string[] = [];
            const hash: string = this.generateTasksForPath(path, processors);
            for (const resourceType in this.tasks[hash].parallel) {
                if (this.tasks[hash].parallel.hasOwnProperty(resourceType)) {
                    tasksNames = tasksNames.concat(this.tasks[hash].parallel[resourceType]);
                }
            }
            return tasksNames;
        }

        /**
         * Generates tasks corresponding to a yaml file.
         *
         * @param {string} path
         * @param {object} processors
         *
         * @returns string hash corresponding to the input path
         */
        private generateTasksForPath(path: string, processors: { [key: string]: (stream: any, options: any) => any }): string {
            const hash: string = crypto.createHash('md5').update(path).digest("hex");
            if (!Utils.isUndefined(this.tasks[hash])) {
                return hash;
            }
            this.tasks[hash] = {series: {}, parallel: {}};
            for (const processingType in this.tasks[hash]) {
                if (this.tasks[hash].hasOwnProperty(processingType)) {
                    for (let i = 0; i < GulpFile.ResourcesTypes.length; ++i) {
                        (this.tasks[hash] as any)[processingType][GulpFile.ResourcesTypes[i]] = [];
                    }
                }
            }
            let packageFile = new PackageFile(path, this.options);
            let configuration = packageFile.getGulpfileConfiguration();

            if (configuration !== null) {
                for (let i = 0; i < configuration.packages.length; ++i) {
                    for (let pname in processors) {
                        if (processors.hasOwnProperty(pname)) {
                            configuration.processors.register(pname, processors[pname]);
                        }
                    }
                    for (let j = 0; j < GulpFile.ResourcesTypes.length; ++j) {
                        let rt = GulpFile.ResourcesTypes[j];
                        let conf: PackageInputOutputConfiguration[] =
                            Utils.ensureArray((<any>configuration).packages[i][rt]);
                        for (let k = 0; k < conf.length; ++k) {
                            let task: GulpTask = null;
                            switch (rt) {
                                case 'scripts':
                                    task = new ScriptsTask(this, rt, conf[k], configuration.processors);
                                    break;
                                case 'styles':
                                    task = new StylesTask(this, rt, conf[k], configuration.processors);
                                    break;
                                default:
                                    task = new MiscTask(this, rt, conf[k], configuration.processors);
                                    break;
                            }
                            this.tasks[hash].series[rt].push(task);
                            this._gulp.task(task.getName(), (function (t: GulpTask) {
                                return function () {
                                    return t.execute();
                                };
                            })(task));
                        }
                    }
                }
                if (this.options.watch) {
                    this.createWatchTasks(hash, configuration.packages);
                }
            }
            return hash;
        }

        /**
         * Create tasks responsible for watching changes on input files.
         * This method generates a task for each type of resources.
         *
         * @param {string}                      hash
         * @param {GulpfileTaskConfiguration[]} packages
         */
        private createWatchTasks(hash: string, packages: GulpfileTaskConfiguration[]): void {
            let files: { [key: string]: string[] } = {};
            let filesWatchedCount: number = 0;
            let globWatchedCount: number = 0;
            let watchTasksCount: number = 0;

            for (let i = 0; i < packages.length; ++i) {
                for (let j = 0; j < GulpFile.ResourcesTypes.length; ++j) {
                    let rt = GulpFile.ResourcesTypes[j];
                    let conf: PackageInputOutputConfiguration[] = Utils.ensureArray((<any>packages)[i][rt]);

                    files[rt] = Utils.ensureArray(files[rt]);
                    for (let k = 0; k < conf.length; ++k) {
                        for (let l = 0; l < conf[k].watch.length; ++l) {
                            if (this.options.verbose) {
                                Log.info('Manually watching', "'" + Log.Colors.cyan(conf[k].watch[l].absolute) + "'");
                            }
                            files[rt].push(conf[k].watch[l].absolute);
                            globWatchedCount += conf[k].watch[l].isGlob ? 1 : 0;
                            filesWatchedCount += !conf[k].watch[l].isGlob ? 1 : 0;
                        }
                        for (let l = 0; l < conf[k].input.length; ++l) {
                            for (let m = 0; m < conf[k].input[l].files.length; ++m) {
                                let path = conf[k].input[l].files[m].absolute;
                                if (files[rt].indexOf(path) < 0 && conf[k].autoWatch !== false && !path.match(/[\/\\]node_modules[\/\\]/)) {
                                    if (this.options.verbose) {
                                        Log.info('Auto watching', "'" + Log.Colors.magenta(path) + "'");
                                    }
                                    files[rt].push(path);
                                    globWatchedCount += conf[k].input[l].files[m].isGlob ? 1 : 0;
                                    filesWatchedCount += !conf[k].input[l].files[m].isGlob ? 1 : 0;
                                }
                            }
                        }
                    }
                }
            }
            let firstTaskName: string = null;
            for (let type in files) {
                if (files.hasOwnProperty(type) && files[type].length > 0) {
                    let name = '_gyp_watch_' + type + "_" + hash;
                    firstTaskName = firstTaskName !== null ? firstTaskName : name;
                    this.tasks[hash].parallel[type].push(name);
                    this._gulp.task(name, (function (that: GulpFile, n: string, rt: string, files: string[]) {
                        return function () {
                            if (firstTaskName === n) {
                                Log.info(
                                    Log.Colors.yellow('Watching'), Log.Colors.magenta(filesWatchedCount),
                                    'files and', Log.Colors.magenta(globWatchedCount), 'globs in total. Using',
                                    Log.Colors.magenta(watchTasksCount), 'tasks.'
                                );
                            }
                            watch(files, (file: any) => {
                                Log.info('Change on', "'" + Log.Colors.magenta(file.path) + "'");
                                for (let j = 0; j < that.tasks[hash].series[rt].length; ++j) {
                                    that.tasks[hash].series[rt][j].execute();
                                }
                            });
                        };
                    })(this, name, type, files[type]));
                    ++watchTasksCount;
                }
            }
        }
    }

    /**
     * Get or create a GulpFile object.
     */
    function getGulpFileInstance(gulp: any): GulpFile {
        if (gulpfile === null) {
            gulpfile = new GulpFile(gulp);
        }
        return gulpfile;
    }

    /**
     * Entry point of the module.
     *
     * @param {string} path       path to the YAML file to generate gulp tasks for
     * @param {object} gulp       the instance of gulp returned by calling "require('gulp')" in the gulpfile.js
     * @param {object} processors a key/value pair like 'processorName => processorFunc()'
     *                          to add custom processors or override internal ones.
     * @returns string[] created tasks' names
     *
     * @deprecated use loadForSeries() and loadForParallel() instead (for gulp 4).
     */
    module.exports.load = function(path: string, gulp: any,
                                   processors: {[key: string]: (stream: any, options: any) => any} = {}): string[] {
        try {
            return getGulpFileInstance(gulp).createTasks(path, processors);
        } catch (e) {
            if (e instanceof StopException){
                return [];
            }
            throw e;
        }
    };

    /**
     * New entry point to not break the compatibility with gulp 3.
     *
     * @param {string} path       path to the YAML file to generate gulp tasks for
     * @param {object} gulp       the instance of gulp returned by calling "require('gulp')" in the gulpfile.js
     * @param {object} processors a key/value pair like 'processorName => processorFunc()'
     *                          to add custom processors or override internal ones.
     * @returns object object holding two keys: "series" and "parallel". Theses tasks should be passed to gulp "series()" and "parallel()" respectively.
     */
    module.exports.loadForGulp4 = function(path: string, gulp: any, processors: {[key: string]: (stream: any, options: any) => any} = {}): {series: string[], parallel: string[]} {
        try {
            const gulpfile: GulpFile = getGulpFileInstance(gulp);
            return {
                series: gulpfile.createTasksForSeries(path, processors),
                parallel: gulpfile.createTasksForParallel(path, processors)
            };
        } catch (e) {
            if (e instanceof StopException){
                return {
                    series: [],
                    parallel: []
                };
            }
            throw e;
        }
    };
}

