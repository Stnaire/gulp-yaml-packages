/// <reference path="helpers/FileSystem.ts" />
/// <reference path="helpers/Utils.ts" />
/// <reference path="helpers/Log.ts" />

namespace GP {
    import FileSystem = GP.Helpers.FileSystem;
    import Utils = GP.Helpers.Utils;
    import Log = GP.Helpers.Log;

    let plumber = require('gulp-plumber');

    export class ProcessorsManager {
        /**
         * Modules used by built-in processors, indexed by name.
         */
        static modules: {[key: string]: any} = {};

        /**
         * Hardcoded processors list.
         * They can be overridden if the user so desire.
         */
        private baseConfigurations: {[key: string]: PackageFileProcessorConfiguration};

        /**
         * List of processors' names ordered by execution priority.
         */
        private baseExecutionOrder: string[];

        /**
         * Array of processors index by the id of the file that declared them.
         */
        private configurations: {[key: number]: PackageFileProcessorConfiguration[]};

        /**
         * Processors callbacks.
         */
        private callbacks: {[key: string]: (stream: any, options: any) => any};
        
        constructor() {
            this.configurations = {};
            this.callbacks = this.getBaseCallbacks();
            this.baseConfigurations = this.getBaseConfigurations();
            this.baseExecutionOrder = this.getBaseExecutionOrder();
        }

        /**
         * Register a processor.
         * Default processors can be overridden if you feel the need.
         *
         * @param {string}   name
         * @param {function} callback
         */
        public register(name: string, callback: (stream: any, options: any) => any): void {
            this.callbacks[name] = callback;
        }

        /**
         * Register a list of processors' default configurations for a package file.
         *
         * @param {number}                              packageFileId
         * @param {PackageFileProcessorConfiguration[]} configurations
         */
        public registerDefaultConfigurations(packageFileId: number, configurations: PackageFileProcessorConfiguration[]): void {
            this.configurations[packageFileId] = configurations;
        }

        /**
         * Get processors matching a given file path.
         * The matching is based on the extension of the file.
         *
         * @param {string} path
         * @param {number} packageId    (optional)
         * @param {object} specificConf (optional)
         *
         * @returns {object}
         */
        public resolve(path: string, packageId: number = -1, specificConf: {[key: string]: Object} = {}): GulpfileProcessorsConfiguration {
            let ext = FileSystem.getExtension(path);
            let output: GulpfileProcessorsConfiguration = {
                executionOrder: this.baseExecutionOrder.slice(),
                processors: {}
            };
            for (let pname in this.baseConfigurations) {
                if (this.baseConfigurations.hasOwnProperty(pname)) {
                    if (this.baseConfigurations[pname].extensions.indexOf(ext) >= 0) {
                        let cname = this.baseConfigurations[pname].callback;
                        output.processors[cname] = Utils.clone(this.baseConfigurations[pname].options);
                    }
                }
            }
            if (packageId > 0 && Utils.isArray(this.configurations[packageId])) {
                let subOrder: string[] = [];
                for (let i = 0; i < this.configurations[packageId].length; ++i) {
                    let conf = this.configurations[packageId][i];
                    let pos = output.executionOrder.indexOf(conf.callback);
                    if (pos < 0) {
                        subOrder.push(conf.callback);
                    } else if (subOrder.length) {
                        Array.prototype.splice.apply(output.executionOrder, [pos, 0].concat(<any>subOrder));
                        subOrder = [];
                    }
                    if (conf.extensions.indexOf(ext) >= 0) {
                        output.processors[conf.callback] = Utils.clone(conf.options);
                    }
                }
                if (subOrder.length) {
                    Array.prototype.push.apply(output.executionOrder, subOrder);
                }
            }
            for (let pname in specificConf) {
                let resolved = this.getConfigurationByName(pname, packageId);
                if (resolved !== null) {
                    output.processors[resolved.callback] = Utils.clone(resolved.options);
                } else {
                    output.processors[pname] = Utils.clone(specificConf[pname]);
                }
            }
            return output;
        }

        /**
         * Test if two processors configurations can be considered equal or not.
         *
         * @param {GulpfileProcessorsConfiguration} a
         * @param {GulpfileProcessorsConfiguration} b
         *
         * @returns {boolean}
         */
        public equals(a: GulpfileProcessorsConfiguration, b: GulpfileProcessorsConfiguration): boolean {
            let isEmpty = (i: GulpfileProcessorsConfiguration): boolean => {
                return i === null || !Object.keys(i.processors).length;
            };
            if (isEmpty(a) && isEmpty(b)) { return true }
            if (isEmpty(a) || isEmpty(b)) { return false }
            return Utils.equals(a.processors, b.processors);
        }

        /**
         * Execute a processor by callback name.
         *
         * @param {string} name
         * @param {object} options
         * @param {object} stream
         *
         * @returns any
         */
        public execute(name: string, options: Object, stream: any): any {
            if (Utils.isSet(this.callbacks[name])) {
                return this.callbacks[name].apply(null, [stream, options]);
            } else {
                Log.fatal('Processor', "'"+Log.Colors.red(name)+"'", 'does not exist.');
            }
        }

        /**
         * Try to find a processor's configuration by name.
         *
         * @param {string} name
         * @param {number} packageId (optional) package id to search in
         *
         * @returns {PackageFileProcessorConfiguration}
         */
        protected getConfigurationByName(name: string, packageId: number = -1): PackageFileProcessorConfiguration {
            if (packageId > 0 && Utils.isArray(this.configurations[packageId])) {
                for (let i = 0; i < this.configurations[packageId].length; ++i) {
                    if (this.configurations[packageId][i].name === name) {
                        return this.configurations[packageId][i];
                    }
                }
            }
            if (Utils.isSet(this.baseConfigurations[name])) {
                return this.baseConfigurations[name];
            }
            return null;
        }

        /**
         * Defines the list of default processors configuration.
         *
         * @returns {object}
         */
        protected getBaseCallbacks(): {[key: string]: (stream: any, options: any) => any} {
            return {
                //
                // Scripts processors
                //
                typescript: function(stream: any, options: any): any {
                    return stream.pipe(ProcessorsManager.require('gulp-typescript')(options)).js;
                },

                coffee: function(stream: any, options: any): any {
                    return stream.pipe(ProcessorsManager.require('gulp-coffee')(options));
                },

                //
                // Styles processors
                //
                sass: function(stream: any, options: any): any {
                    return stream.pipe(ProcessorsManager.require('gulp-sass')(options));
                },

                less: function(stream: any, options: any): any {
                    return stream.pipe(ProcessorsManager.require('gulp-less')(options));
                },

                // Replace part of paths in css files.
                cssurladjuster: function(stream, options) {
                    return stream.pipe(ProcessorsManager.require('gulp-css-url-adjuster')(options));
                },

                //
                // Images processor
                //
                image: function(stream, options) {
                    return stream.pipe(ProcessorsManager.require('gulp-image-optimization')(options));
                }
            };
        }

        /**
         * Defines the list of default processors configuration.
         *
         * @returns {object}
         */
        protected getBaseConfigurations(): {[key: string]: PackageFileProcessorConfiguration} {
            return {
                /**
                 * Scripts
                 */
                typescript: {
                    name: 'typescript',
                    callback: 'typescript',
                    extensions: ['ts'],
                    options: {
                        noImplicitAny: true
                    }
                },
                coffee: {
                    name: 'coffee',
                    callback: 'coffee',
                    extensions: ['coffee'],
                    options: {}
                },

                /**
                 * Styles
                 */
                sass: {
                    name: 'sass',
                    callback: 'sass',
                    extensions: ['sass', 'scss'],
                    options: {}
                },
                less: {
                    name: 'less',
                    callback: 'less',
                    extensions: ['less'],
                    options: {}
                }
            };
        }

        /**
         * Gets base processors' names ordered by execution priority.
         *
         * @returns {string[]}
         */
        protected getBaseExecutionOrder(): string[] {
            return ['typescript', 'coffee', 'sass', 'less', 'cssurladjuster', 'image'];
        }

        /**
         * Require a module only on demand.
         * Used for built-in processors to avoid dependency errors.
         *
         * @param {string} name
         *
         * @returns {function}
         */
        static require(name: string): (options: any) => any {
            if (!Utils.isSet(ProcessorsManager.modules[name])) {
                ProcessorsManager.modules[name] = require(name);
            }
            return ProcessorsManager.modules[name];
        }
    }
}

