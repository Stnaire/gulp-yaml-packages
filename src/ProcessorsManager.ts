
namespace GP {
    import FileSystem = GP.Helpers.FileSystem;
    import Utils = GP.Helpers.Utils;
    import Log = GP.Helpers.Log;

    var coffee = require('gulp-coffee');
    var typescript = require('gulp-typescript');
    var less = require('gulp-less');
    var sass = require('gulp-sass');
    var image = require('gulp-image-optimization');
    var cssurlajuster = require('gulp-css-url-adjuster');

    export class ProcessorsManager {
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
         * @param string   name
         * @param function callback
         */
        public register(name: string, callback: (stream: any, options: any) => any): void {
            this.callbacks[name] = callback;
        }

        /**
         * Register a list of processors' default configurations for a package file.
         *
         * @param number                              packageFileId
         * @param PackageFileProcessorConfiguration[] configurations
         */
        public registerDefaultConfigurations(packageFileId: number, configurations: PackageFileProcessorConfiguration[]): void {
            this.configurations[packageFileId] = configurations;
        }

        /**
         * Get processors matching a given file path.
         * The matching is based on the extension of the file.
         *
         * @param string path
         * @param number packageId    (optional)
         * @param object specificConf (optional)
         * @returns object
         */
        public resolve(path: string, packageId: number = -1, specificConf: {[key: string]: Object} = {}): GulpfileProcessorsConfiguration {
            var ext = FileSystem.getExtension(path);
            var output: GulpfileProcessorsConfiguration = {
                executionOrder: this.baseExecutionOrder.slice(),
                processors: {}
            };
            for (var pname in this.baseConfigurations) {
                if (this.baseConfigurations.hasOwnProperty(pname)) {
                    if (this.baseConfigurations[pname].extensions.indexOf(ext) >= 0) {
                        let cname = this.baseConfigurations[pname].callback;
                        output.processors[cname] = Utils.clone(this.baseConfigurations[pname].options);
                    }
                }
            }
            if (packageId > 0 && Utils.isArray(this.configurations[packageId])) {
                var subOrder: string[] = [];
                for (var i = 0; i < this.configurations[packageId].length; ++i) {
                    var conf = this.configurations[packageId][i];
                    var pos = output.executionOrder.indexOf(conf.callback);
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
            for (var pname in specificConf) {
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
         * @param GulpfileProcessorsConfiguration a
         * @param GulpfileProcessorsConfiguration b
         * @returns boolean
         */
        public equals(a: GulpfileProcessorsConfiguration, b: GulpfileProcessorsConfiguration): boolean {
            var isEmpty = (i: GulpfileProcessorsConfiguration): boolean => {
                return i === null || !Object.keys(i.processors).length;
            };
            if (isEmpty(a) && isEmpty(b)) { return true }
            if (isEmpty(a) || isEmpty(b)) { return false }
            return Utils.equals(a.processors, b.processors);
        }

        /**
         * Execute a processor by callback name.
         *
         * @param string name
         * @param object options
         * @param object stream
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
         * @param string name
         * @param number packageId (optional) package id to search in
         * @returns PackageFileProcessorConfiguration
         */
        protected getConfigurationByName(name: string, packageId: number = -1): PackageFileProcessorConfiguration {
            if (packageId > 0 && Utils.isArray(this.configurations[packageId])) {
                for (var i = 0; i < this.configurations[packageId].length; ++i) {
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
         * @returns object
         */
        protected getBaseCallbacks(): {[key: string]: (stream: any, options: any) => any} {
            return {
                //
                // Scripts processors
                //
                typescript: function(stream: any, options: any): any {
                    return stream.pipe(typescript(options).on('error', Log.error)).js;
                },

                coffee: function(stream: any, options: any): any {
                    return stream.pipe(coffee(options).on('error', Log.error));
                },

                //
                // Styles processors
                //
                sass: function(stream: any, options: any): any {
                    return stream.pipe(sass(options).on('error', Log.error));
                },

                less: function(stream: any, options: any): any {
                    return stream.pipe(less(options).on('error', Log.error));
                },

                // Replace part of paths in css files.
                cssurlajuster: function(stream, options) {
                    options =  Utils.ensureArray(options);
                    for (var i = 0; i < options.length; ++i) {
                        stream = stream.pipe(cssurlajuster({
                            replace: [
                                options[i].from,
                                options[i].to
                            ]
                        }).on('error', Log.error));
                    }
                    return stream;
                },

                //
                // Images processor
                //
                image: function(stream, options) {
                    return stream.pipe(image(options).on('error', Log.error));
                }
            };
        }

        /**
         * Defines the list of default processors configuration.
         *
         * @returns object
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
         * @returns string[]
         */
        protected getBaseExecutionOrder(): string[] {
            return ['typescript', 'coffee', 'sass', 'less', 'cssurlajuster', 'image'];
        }
    }
}
