
namespace GP {
    import FileSystem = GP.Helpers.FileSystem;
    import Log = GP.Helpers.Log;
    import Utils = GP.Helpers.Utils;

    var loadedConfigurationsMaxId = 0;
    var loadedConfigurations: PackageFileConfiguration[] = [];
    var loadingStack: string[] = [];

    export class PackageFile {
        private id: number;
        private dirname: string;
        private context: string[] = [];
        private configuration: PackageFileConfiguration;
        private gulpfileConfiguration: GulpfileConfiguration;

        constructor(public path: string, public options: Options) {
            this.id = ++loadedConfigurationsMaxId;
            this.path = FileSystem.getAbsolutePath(path);
            this.dirname = FileSystem.getDirectoryName(this.path);
            this.contextIn(FileSystem.getRelativePath(__dirname, this.path));
            this.load();
        }

        /**
         * Gets the GulpfileConfiguration object created from the yml file.
         *
         * @return GulpfileConfiguration
         */
        public getGulpfileConfiguration(): GulpfileConfiguration {
            if (!this.gulpfileConfiguration) {
                var packages: GulpfileTaskConfiguration[] = [];
                var processors = new ProcessorsManager();

                for (var i = 0; i < loadedConfigurations.length; ++i) {
                    processors.registerDefaultConfigurations(loadedConfigurations[i].id, loadedConfigurations[i].processors);
                }
                for (var pname in this.configuration.packages) {
                    this.contextIn(pname);
                    if (this.configuration.packages.hasOwnProperty(pname)) {
                        for (var i = 0; i < this.configuration.packages[pname].length; ++i) {
                            let p = this.createGulpfilePackage(this.configuration.packages[pname][i]);
                            if (p !== null) {
                                packages.push(p);
                            }
                        }
                    }
                    this.contextOut();
                }
                this.gulpfileConfiguration = {
                    processors: processors,
                    packages: packages
                };
            }
            return this.gulpfileConfiguration;
        }

        /**
         * Creates a GulpfileTaskConfiguration object from a PackageConfiguration object.
         *
         * @param PackageConfiguration configuration
         * @returns GulpfileTaskConfiguration
         */
        private createGulpfilePackage(configuration: PackageConfiguration): GulpfileTaskConfiguration {
            if (!configuration.standalone) { return null }
            var resolved: PackageConfiguration[] = [];
            var misc: PackageInputOutputConfiguration[] = (configuration.misc || []).slice() as PackageInputOutputConfiguration[];
            for (var i = 0; i < configuration.deps.length; ++i) {
                let res = this.findClosestPackage(configuration.deps[i]);
                if (res !== null) {
                    if (Utils.isSet(res['misc'])) {
                        Array.prototype.push.apply(misc, res['misc']);
                    }
                    resolved.push(res);
                }
            }
            var output: GulpfileTaskConfiguration = {
                name: configuration.name.name,
                theme: configuration.theme,
                version: configuration.version.text,
                scripts: this.mergeDependencies('scripts', configuration.scripts, resolved),
                styles: this.mergeDependencies('styles', configuration.styles, resolved),
                misc: misc
            };
            return output.scripts || output.styles || (output.misc && output.misc.length) ? output : null;
        }

        /**
         * Merge a list of dependencies with a package input.
         *
         * @param string                          type
         * @param PackageInputOutputConfiguration configuration
         * @param PackageConfiguration            deps
         * @returns PackageInputOutputConfiguration
         */
        private mergeDependencies(type: string,
                                  configuration: PackageInputOutputConfiguration,
                                  deps: PackageConfiguration[]): PackageInputOutputConfiguration {
            // If 'configuration.output' is null, the package will never generate any output.
            // But rather than returning 'null', it's better to check dependencies and local input to see
            // if resources have been defined. If so, a warning will be generated in strict mode
            // so the user can know an output may have been forgotten.
            // if (!configuration || !configuration.output) { return null }
            var output: PackageInputOutputConfiguration = {
                input: [],
                output: configuration && configuration.output ? (Utils.extend({}, configuration.output) as PackageOutputConfiguration) : null
            };
            for (var i = 0; i < deps.length; ++i) {
                var dep: PackageInputOutputConfiguration = (<any>deps)[i][type];
                if (Utils.isSet(dep)) {
                    if (output.output !== null) {
                        Array.prototype.push.apply(output.input, dep.input);
                    } else if (this.options.strict) {
                        Log.warning(
                            'Dependency', "'"+Log.Colors.red(deps[i].name.name)+"'",
                            'defines', "'"+Log.Colors.yellow(type)+"'",
                            "input but no output has been defined on the including package.",
                            this.getContextString()
                        );
                    }
                }
            }
            if (output.output !== null) {
                Array.prototype.push.apply(output.input, configuration.input);
            } else if (this.options.strict && configuration && configuration.input.length) {
                Log.warning(
                    'Input', "'"+Log.Colors.red(type)+"'", 'have been defined with no output.',
                    this.getContextString()
                );
            }
            return (configuration && configuration.output) ? output : null;
        }

        /**
         * Gets the PackageFileConfiguration object created from the yml file.
         *
         * @return PackageFileConfiguration
         */
        public getPackageFileConfiguration(): PackageFileConfiguration {
            return this.configuration;
        }

        /**
         * Load the package file and construct a PackageFileConfiguration object.
         */
        private load(): void {
            if (!this.configuration) {
                this.checkForCircularDependency();
                loadingStack.push(this.path);
                if (!this.loadFromCache()) {
                    if (this.options.verbose) {
                        Log.info('Loading', Log.Colors.cyan(this.path));
                    }
                    var raw = FileSystem.getYamlFileContent(this.path);
                    if (raw !== null) {
                        var normalized = this.normalize(raw);
                        this.registerInCache(normalized);
                        this.resolveImports(normalized);
                        this.mergeDependenciesDeclarations(normalized);
                        this.configuration = normalized;
                    }
                }
                loadingStack.pop();
            }
        }

        /**
         * Try to load a the package file from the cache.
         *
         * @return boolean
         */
        private loadFromCache(): boolean {
            for (var i = 0; i < loadedConfigurations.length; ++i) {
                if (loadedConfigurations[i].path === this.path) {
                    this.configuration = Utils.extend({}, loadedConfigurations[i]) as PackageFileConfiguration;
                    return true;
                }
            }
            return false;
        }

        /**
         * Register a package file configuration in the cache.
         *
         * @param PackageFileConfiguration configuration
         */
        private registerInCache(configuration: PackageFileConfiguration): void {
            if (isNaN(configuration.id) || configuration.id <= 0) {
                throw "A PackageFileConfiguration must have an id in order to be cached.";
            }
            for (var i = 0; i < loadedConfigurations.length; ++i) {
                if (loadedConfigurations[i].id === configuration.id) {
                    if (loadedConfigurations[i].path !== configuration.path) {
                        throw "A different PackageFileConfiguration has already been registered with the id '"+configuration.id+"'.";
                    }
                    return ;
                }
            }
            loadedConfigurations.push(configuration);
        }

        /**
         * Check the loading stack to see if the current package file is already in it and
         * show a warning to the user if so. Don't need to throw an exception or to stop the loading process
         * because of the cache, a package file cannot be loaded twice so there is no real risk to have a problem.
         *
         * But letting the user know he's doing something wrong is a good thing.
         */
        private checkForCircularDependency(): void {
            if (loadingStack.indexOf(this.path) >= 0) {
                var messages: string[] = [
                    'Circular dependency detected when importing',
                    "'" + Log.Colors.red(this.path) + "'.",
                    "Details of the stack :\n"
                ];
                for (var j = 0; j < loadingStack.length; ++j) {
                    if (loadingStack[j] === this.path) {
                        Array.prototype.push.apply(messages, [Log.Colors.bgRed.black(' ! '), Log.Colors.red(loadingStack[j]) + "\n"]);
                    } else {
                        Array.prototype.push.apply(messages, ['OK', Log.Colors.magenta(loadingStack[j]) + "\n"]);
                    }
                }
                messages.push(Log.Colors.bgRed.black(' ! ')+' ' + Log.Colors.red(this.path) + "\n");
                Log.warning.apply(null, messages);
            }
        }

        /**
         * Normalize raw data from a YAML file to a valid PackageFileConfiguration object.
         *
         * @param object raw
         * @returns PackageFileConfiguration
         */
        private normalize(raw: any): PackageFileConfiguration {
            var parameters: any = this.normalizeParameters(raw.parameters);

            parameters._theme = this.options.theme;
            parameters._env = this.options.env;
            while (this.resolveParameters(parameters, parameters));
            while (this.resolveParameters(parameters, raw));
            return {
                id: this.id,
                path: this.path, 
                parameters: parameters,
                processors: this.normalizeProcessors(raw.processors),
                packages: this.normalizePackages(raw.packages),
                imports: this.normalizeImports(raw.imports)
            };
        }

        /**
         * Normalize the 'parameters' key of a PackageFileConfiguration object.
         *
         * @param mixed raw
         * @returns object
         */
        private normalizeParameters(raw: any): Object {
            var output: any = {};

            if (!Utils.isObject(raw)) { return output }
            this.contextIn('parameters');
            for (var i in raw) {
                if (raw.hasOwnProperty(i)) {
                    if (this.isValidKey(i)) {
                        if ((/string|number/).test(typeof(raw[i]))) {
                            output[i] = raw[i];
                        } else if (this.options.verbose) {
                            Log.error(
                                'Invalid parameter value for', "'"+Log.Colors.yellow(i)+"'",
                                "(type '"+Log.Colors.red(Utils.asString(raw[i]))+"').",
                                this.getContextString()
                            );
                        }
                    } else if (this.options.verbose) {
                        Log.error('Invalid parameter name', "'"+Log.Colors.red(Utils.asString(i))+"'.", this.getContextString());
                    }
                }
            }
            this.contextOut();
            return output;
        }

        /**
         * Normalize the 'processors' key of a PackageFileConfiguration object.
         *
         * @param mixed raw
         * @returns PackageFileProcessorsConfiguration
         */
        private normalizeProcessors(raw: any): PackageFileProcessorConfiguration[] {
            var output:PackageFileProcessorConfiguration[] = [];

            if (!Utils.isObject(raw)) { return output }
            this.contextIn('processors');
            if (!Utils.isArray(raw)) { raw = [raw] }
            for (var i = 0; i < raw.length; ++i) {
                this.contextIn(i.toString());
                if (Utils.isString(raw[i])) {
                    raw[i] = {name: raw[i]};
                }
                if (!Utils.isArray(raw[i]) && Utils.isObject(raw[i])) {
                    var processor: PackageFileProcessorConfiguration = {
                        name: raw[i].name,
                        callback: raw[i].callback || raw[i].name,
                        extensions: this.normalizeExtensions(raw[i].extensions),
                        options: raw[i].options || {}
                    };
                    if (Utils.isString(processor.name) && processor.name) {
                        if (processor.callback.match(/^[$a-z_]\w*$/i)) {
                            output.push(processor);
                        } else {
                            Log.error(
                                'Invalid processor callback', "'"+Log.Colors.red(Utils.asString(processor.callback))+"'.",
                                'Should be a valid function name.',
                                this.getContextString()
                            );
                        }
                    } else {
                        Log.error(
                            'Invalid processor name', "'"+Log.Colors.red(Utils.asString(processor.name))+"'.",
                            this.getContextString()
                        );
                    }
                } else {
                    Log.error(
                        'Invalid processor value', "'"+Log.Colors.red(Utils.asString(raw[i]))+"'.",
                        this.getContextString()
                    );
                }
                this.contextOut();
            }
            this.contextOut();
            return output;
        }

        /**
         * Normalize the 'packages' key of a PackageFileConfiguration object.
         *
         * @param mixed raw
         * @returns object
         */
        private normalizePackages(raw: any): {[key: string]: PackageConfiguration[]} {
            var output: {[key: string]: PackageConfiguration[]} = {};

            if (!Utils.isObject(raw)) { return output }
            this.contextIn('packages');
            var flattened: any = this.flattenPackages(raw);
            for (var i in flattened) {
                if (flattened.hasOwnProperty(i)) {
                    this.contextIn(i);
                    for (var j = 0; j < flattened[i].length; ++j) {
                        this.contextIn(j.toString());
                        var normalized = this.normalizePackage(i, flattened[i][j]);
                        if (normalized !== null) {
                            if (!Utils.isArray(output[normalized.name.name])) {
                                output[normalized.name.name] = [];
                            }
                            output[normalized.name.name].push(normalized);
                        }
                        this.contextOut();
                    }
                    this.normalizePackagesThemes(output[normalized.name.name]);
                    this.contextOut();
                }
            }
            this.contextOut();
            return output;
        }

        /**
         * Normalize a single package configuration.
         *
         * @param string name package's name
         * @param mixed  raw
         * @returns object
         */
        private normalizePackage(name: string, raw: any): PackageConfiguration {
            if (!Utils.isObject(raw)) {
                return null;
            }
            var normalizedName: PackageName = this.normalizePackageName(name);
            if (normalizedName === null) {
                return null;
            }
            return {
                packageFileId: this.id,
                originalPackageFileId: this.id,
                name: normalizedName,
                depsMerged: false,
                standalone: !Utils.isUndefined(raw['standalone']) ? !!raw['standalone'] : true,
                version: this.normalizePackageVersion(raw['version']),
                theme: this.normalizePackageTheme(raw['theme']),
                scripts: this.normalizePackageInputOutput('scripts', raw['scripts']),
                styles: this.normalizePackageInputOutput('styles', raw['styles']),
                misc: this.normalizePackageMultipleInputOutput('misc', raw['misc']),
                deps: this.normalizePackageDependencies(raw['deps'])
            };
        }

        /**
         * Normalize a package name.
         *
         * @param mixed raw
         * @returns PackageName
         */
        private normalizePackageName(raw: any): PackageName {
            if (!Utils.isString(raw, true) || !raw.match(/^@?\D[\w.-]*$/i)) {
                Log.error(
                    'Invalid package name',
                    "'" + Log.Colors.red(Utils.asString(raw)) + "'.",
                    this.getContextString()
                );
                return null;
            }
            var shared = raw[0] !== '@';
            return {
                name: !shared ? raw.substring(1) : raw,
                shared: shared
            };
        }

        /**
         * Normalize a package version number.
         *
         * @param mixed raw
         * @returns PackageVersion
         */
        private normalizePackageVersion(raw: any): PackageVersion {
            if (!Utils.isString(raw, true) && isNaN(raw)) {
                return {
                    text: null,
                    components: []
                };
            }
            raw = raw + '';
            var output: PackageVersion = {text: Utils.trim(raw), components: []};
            var parts = raw.split('.');
            for (var i = 0; i < parts.length; ++i) {
                var nb = parseInt(parts[i], 10);
                if (isNaN(nb)) {
                    nb = 0;
                    Log.error(
                        'Invalid version number component',
                        "'" + Log.Colors.red(Utils.asString(parts[i])) + "'",
                        'for version',
                        "'" + Log.Colors.yellow(raw) + "'.",
                        'Only numerical components are supported.',
                        this.getContextString()
                    );
                }
                output.components.push(nb);
            }
            return output;
        }

        /**
         * Normalize a package theme.
         *
         * @param mixed raw
         * @returns string
         */
        private normalizePackageTheme(raw: any): string {
            if (Utils.isUndefined(raw)) {
                return null;
            }
            if (!Utils.isString(raw, true)) {
                return 'default';
            }
            return Utils.trim(raw);
        }

        /**
         * Ensure all themes in a batch have a theme or none have one.
         *
         * @param PackageConfiguration[] packages
         */
        private normalizePackagesThemes(packages: PackageConfiguration[]): void {
            var hasTheme: boolean = false;
            for (var i = 0; i < packages.length; ++i) {
                if (packages[i].theme !== null) {
                    hasTheme = true;
                    break ;
                }
            }
            for (var i = 0; i < packages.length; ++i) {
                packages[i].theme = hasTheme ? (packages[i].theme || 'default') : null;
            }
        }

        /**
         * Normalize a package input/output configuration.
         *
         * @param string type
         * @param mixed  raw
         * @returns PackageInputOutputConfiguration
         */
        private normalizePackageInputOutput(type: string, raw: any): PackageInputOutputConfiguration {
            var output: PackageInputOutputConfiguration = null;

            if (!Utils.isSet(raw)) { return null }
            if (Utils.isString(raw)) {
                raw = {input: [raw]};
            }
            this.contextIn(type);
            if (Utils.isDefined(raw, ['input', 'output'], false)) {
                output = {
                    input: this.normalizePackageInput(raw['input']),
                    output: this.normalizePackageOutput(raw['output'])
                };
            } else {
                Log.error(
                    'Invalid value',
                    "'" + Log.Colors.red(Utils.asString(raw)) + "'.",
                    'An object with an input and/or an output key is expected.',
                    this.getContextString()
                );
            }
            this.contextOut();
            return output;
        }

        /**
         * Normalize a package multiple input/output configurations.
         *
         * @param string type
         * @param mixed  raw
         * @returns PackageInputOutputConfiguration[]
         */
        private normalizePackageMultipleInputOutput(type: string, raw: any): PackageInputOutputConfiguration[] {
            var output:PackageInputOutputConfiguration[] = [];

            if (!Utils.isSet(raw)) { return null }
            raw = Utils.ensureArray(raw);
            this.contextIn(type);
            for (let i = 0; i < raw.length; ++i) {
                this.contextIn(i.toString());
                let normalized: PackageInputOutputConfiguration = this.normalizePackageInputOutput(type, raw[i]);
                if (normalized !== null) {
                    output.push(normalized);
                }
                this.contextOut();
            }
            this.contextOut();
            return output;
        }

        /**
         * Normalize a package input configuration.
         *
         * @param mixed raw
         * @returns PackageInputConfiguration[]
         */
        private normalizePackageInput(raw: any): PackageInputConfiguration[] {
            var output: PackageInputConfiguration[] = [];

            if (!Utils.isUndefined(raw)) {
                this.contextIn('input');
                let inputArray = Utils.ensureArray(raw);
                for (let i = 0; i < inputArray.length; ++i) {
                    let rawInput: any = inputArray[i];
                    let normalizedInput: PackageInputConfiguration = {files: [], processors: {}};

                    this.contextIn(i.toString());
                    if (Utils.isString(rawInput)) {
                        rawInput = [rawInput];
                    }
                    if (Utils.isArray(rawInput)) {
                        normalizedInput.files = rawInput;
                    } else if (Utils.isObject(rawInput)) {
                        normalizedInput.files = Utils.ensureArray(rawInput.files);
                        if (Utils.isString(rawInput.processors)) {
                            rawInput.processors = [rawInput.processors];
                        }
                        if (Utils.isArray(rawInput.processors)) {
                            for (let j = 0; j < rawInput.processors.length; ++j) {
                                if (Utils.isString(rawInput.processors[j], true)) {
                                    normalizedInput.processors[rawInput.processors[j]] = null;
                                } else {
                                    Log.error(
                                        'Invalid processor name',
                                        "'"+Log.Colors.red(Utils.asString(rawInput.processors[j]))+"'.",
                                        this.getContextString()
                                    );
                                }
                            }
                        } else if (Utils.isObject(rawInput.processors)) {
                            for (let name in rawInput.processors) {
                                if (rawInput.processors.hasOwnProperty(name)) {
                                    if (Utils.isObject(rawInput.processors[name])) {
                                        normalizedInput.processors[name] = rawInput.processors[name];
                                    } else {
                                        normalizedInput.processors[name] = {};
                                        if (Utils.isSet(rawInput.processors[name])) {
                                            Log.error(
                                                'Invalid options',
                                                "'" + Log.Colors.red(Utils.asString(rawInput.processors[name])) + "'",
                                                'for processor',
                                                "'" + Log.Colors.cyan(name) + "'.",
                                                'You should define an object or null (~ in yaml).',
                                                this.getContextString()
                                            );
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Resolve paths
                    for (let j = 0; j < normalizedInput.files.length; ++j) {
                        var path = this.normalizePath(normalizedInput.files[j]);
                        if (path !== null) {
                            normalizedInput.files[j] = path;
                        } else {
                            normalizedInput.files.splice(j--, 1);
                        }
                    }
                    output.push(normalizedInput);
                    this.contextOut();
                }
                this.contextOut();
            }
            return output;
        }

        /**
         * Normalize a package output configuration.
         *
         * @param mixed raw
         * @returns PackageOutputConfiguration
         */
        private normalizePackageOutput(raw: any): PackageOutputConfiguration {
            var output: PackageOutputConfiguration = {dev: null, prod: null};
            if (!Utils.isUndefined(raw)) {
                this.contextIn('output');
                if (Utils.isString(raw)) {
                    let path = this.normalizePath(raw);
                    output = {dev: path, prod: path};
                } else if (Utils.isObject(raw)) {
                    let dev = this.normalizePath(raw['dev']);
                    let prod = this.normalizePath(raw['prod']);
                    output = {dev: dev || prod, prod: prod || dev};
                }
                this.contextOut();
            }
            return output.dev !== null && output.prod !== null ? output : null;
        }

        /**
         * Normalize the 'deps' key of a package.
         *
         * @param mixed raw
         * @returns PackageDependencyConfiguration[]
         */
        private normalizePackageDependencies(raw: any): PackageDependencyConfiguration[] {
            var output: PackageDependencyConfiguration[] = [];

            this.contextIn('deps');
            raw = Utils.ensureArray(raw);
            for (var i = 0; i < raw.length; ++i) {
                this.contextIn(i.toString());
                if (!Utils.isString(raw[i], true)) {
                    Log.error(
                        'Invalid dependency',
                        "'"+Log.Colors.red(Utils.asString(raw[i]))+"'.",
                        'A string is expected.',
                        this.getContextString()
                    );
                    continue ;
                }
                var match = raw[i].match(/^(.*\.(?:yml|yaml))#([\w.-]+)(?::([\w.-]+))?(?:#([\w.-]+))?$/i);
                if (match !== null) {
                    let path = this.normalizePath(match[1]);
                    let packageFile = new PackageFile(path.absolute, this.options);
                    let packageFileConf = packageFile.getPackageFileConfiguration();

                    if (Utils.isSet(packageFileConf)) {
                        output.push({
                            packageFileId: packageFileConf.id,
                            packageName: match[2],
                            packageTheme: this.normalizePackageTheme(match[3]),
                            packageVersion: this.normalizePackageVersion(match[4])
                        });
                    } else {
                        Log.error(
                            'Failed to load package file',
                            "'" + Log.Colors.red(path.absolute) + "'.",
                            this.getContextString()
                        );
                    }
                } else {
                    match = raw[i].match(/^(\D[\w.-]*)(?::([\w.-]+))?(?:#([\w.-]+))?$/i);
                    if (match !== null) {
                        output.push({
                            packageFileId: this.id,
                            packageName: match[1],
                            packageTheme: this.normalizePackageTheme(match[2]),
                            packageVersion: this.normalizePackageVersion(match[3])
                        });
                    } else {
                        Log.error(
                            'Invalid dependency',
                            "'"+Log.Colors.red(Utils.asString(raw[i]))+"'.",
                            'Syntax error, please refer to the documentation.',
                            this.getContextString()
                        );
                    }
                }
                this.contextOut();
            }
            this.contextOut();
            return output;
        }

        /**
         * Normalize the 'imports' key of a PackageFileConfiguration object.
         *
         * @param mixed raw
         * @returns Path[]
         */
        private normalizeImports(raw: any): Path[] {
            var output: Path[] = [];

            if (Utils.isSet(raw)) {
                if (!Utils.isArray(raw)) { raw = [raw] }
                for (var i = 0; i < raw.length; ++i) {
                    if (Utils.isString(raw[i], true)) {
                        var path = this.normalizePath(raw[i], true);
                        if (path !== null) {
                            output.push(path);
                        }
                    } else {
                        Log.error(
                            'Invalid import value', "'" + Log.Colors.red(Utils.asString(raw[i])) + "' (should be a string).",
                            this.getContextString()
                        );
                    }
                }
            }
            return output;
        }

        /**
         * Normalize a list of extensions.
         * Ensure they are valid strings, lowercase and without a dot at the beginning.
         *
         * @param mixed raw
         * @returns string[]
         */
        private normalizeExtensions(raw: any): string[] {
            var output: string[] = [];

            this.contextIn('extensions');
            if (!Utils.isUndefined(raw)) {
                if (!Utils.isArray(raw)) { raw = [raw] }
                for (var i = 0; i < raw.length; ++i) {
                    this.contextIn(i.toString());
                    if (Utils.isString(raw[i]) && raw[i].match(/^[a-z.][a-z0-9]*$/i)) {
                        output.push((raw[i][0] === '.' ? raw[i].substring(1) : raw[i]).toLowerCase());
                    } else if (this.options.verbose) {
                        Log.error(
                            'Invalid extension', "'" + Log.Colors.red(Utils.asString(raw[i])) + "'.",
                            this.getContextString()
                        );
                    }
                    this.contextOut();
                }
            }
            this.contextOut();
            return output;
        }

        /**
         * Resolve parameters in the 'input' AND 'parameters' arguments.
         *
         * @param object parameters
         * @param mixed  input
         * @returns boolean true if a change has been made
         */
        private resolveParameters(parameters: any, input: any): boolean {
            var changed = false;

            if (Utils.isObject(input)) {
                for (var i in input) {
                    if (input.hasOwnProperty(i)) {
                        if (Utils.isString(input[i])) {
                            let reg: RegExp = new RegExp('%([^%]+)%', 'g');
                            let match: any = null;

                            while ((match = reg.exec(input[i]))) {
                                if (!Utils.isUndefined(parameters[match[1]])) {
                                    var repReg: RegExp = new RegExp(match[0], 'g');
                                    input[i] = input[i].replace(repReg, parameters[match[1]]);
                                    changed = true;
                                }
                            }
                        } else {
                            changed = this.resolveParameters(parameters, input[i]) || changed;
                        }
                    }
                }
            }
            return changed;
        }

        /**
         * Flatten packages to the dot notation, like:
         *
         * app:
         *   frontend:
         *     etc:
         *       script: '..'
         *       styles: '..'
         *
         * will become:
         *
         * app.frontend.etc:
         *   -
         *     scripts: '..'
         *     styles: '..'
         *
         * @param mixed  data
         * @param string name internal use only
         *
         * @returns object
         */
        private flattenPackages(data: any, name: string = ''): Object {
            var output: any = {};
            var keys = ['scripts', 'styles', 'misc', 'deps']; // 'version' and 'theme' are not enough to consider it a valid package.

            if (Utils.isArray(data) || !Utils.isObject(data)) {
                return null;
            }
            for (let i in data) {
                if (data.hasOwnProperty(i)) {
                    let dataArray = Utils.ensureArray(data[i]);
                    let lname = name + ((name !== '') ? '.' : '');
                    if (i[0] === '@') {
                        lname = (lname[0] !== '@' ? '@' : '')+lname+i.substring(1);
                    } else {
                        lname += i;
                    }
                    for (let j = 0; j < dataArray.length; ++j) {
                        if (Utils.isDefined(dataArray[j], keys, false)) {
                            for (var k = 0; k < keys.length; ++k) {
                                var v = dataArray[j][keys[k]];
                                if (!Utils.isUndefined(v) && (Utils.isArray(v) || !Utils.isObject(v) || Utils.isDefined(v, ['input', 'output'], false))) {
                                    if (!Utils.isArray(output[lname])) {
                                        output[lname] = [];
                                    }
                                    output[lname].push(dataArray[j]);
                                    break;
                                }
                            }
                        }
                        let res = this.flattenPackages(data[i], lname);
                        if (res !== null) {
                            Utils.extend(output, res);
                        }
                    }
                }
            }
            return output;
        }

        /**
         * Test if data defines a package.
         *
         * @param object  data
         * @param boolean ensureExistence
         * @returns Path
         */
        private normalizePath(input: any, ensureExistence: boolean = false): Path {
            if (Utils.isSet(input)) {
                var isGlob: boolean = Utils.isGlob(input);
                var globBase: string = '';
                var original: string = Utils.trim(Utils.asString(input));
                var absolute: string = FileSystem.getAbsolutePath(original, this.dirname);

                if (ensureExistence && !isGlob && !FileSystem.fileExists(absolute)) {
                    Log.warning(
                        'File', "'" + Log.Colors.red(absolute) + "'", 'not found.',
                        this.getContextString()
                    );
                    return null;
                }

                if (isGlob) {
                    let pos = absolute.indexOf(FileSystem.separator+'**');
                    if (pos >= 0 && (pos === absolute.length - 3 || absolute[pos + 1] === FileSystem.separator)) {
                        globBase = absolute.substring(0, pos);
                    }
                }
                return {
                    packageId: this.id,
                    original: original,
                    absolute: absolute,
                    extension: FileSystem.getExtension(absolute),
                    isGlob: isGlob,
                    globBase: globBase
                };
            }
            return null;
        }

        /**
         * Compares two version number.
         *
         * @param PackageVersion a
         * @param PackageVersion b
         * @returns number if < 0: a is older, if > 0: b is older, if === 0: same version.
         */
        private compareVersions(a: PackageVersion, b: PackageVersion): number {
            var swap = a.components.length < b.components.length;
            var a1 = swap ? b : a;
            var b1 = swap ? a : b;

            for (var i = 0; i < a1.components.length; ++i) {
                let av = a1.components[i];
                let bv = i < b1.components.length ? b1.components[i] : 0;
                if (av > bv) {
                    return swap ? -1 : 1;
                } else if (av < bv) {
                    return swap ? 1 : -1;
                }
            }
            return 0;
        }

        /**
         * Merges dependencies declarations of a PackageFileConfiguration and ensure each package is only required once.
         * If the same package is required multiple times in a single package after the merge,
         * the most recent one will be kept.
         *
         * Only PackageDependencyConfiguration objects are merged here, not resources.
         * Resources are merged in the resolveDependencies() method, only called to generate a GulpfileConfiguration object.
         *
         * @param PackageFileConfiguration config
         */
        private mergeDependenciesDeclarations(config: PackageFileConfiguration): void {
            for (var name in config.packages) {
                this.contextIn(['packages', name]);
                if (config.packages.hasOwnProperty(name)) {
                    for (var i = 0; i < config.packages[name].length; ++i) {
                        this.mergePackageDependenciesDeclarations(config.packages[name][i]);
                    }
                }
                this.contextOut(2);
            }
        }

        /**
         * Merges dependencies declarations of a package with its dependencies.
         *
         * @param PackageFileConfiguration config
         */
        private mergePackageDependenciesDeclarations(config: PackageConfiguration): void {
            if (config.depsMerged) { return }

            this.contextIn([config.name.name, 'deps']);
            for (var j = 0; j < config.deps.length; ++j) {
                this.contextIn(j.toString());
                let dep = config.deps[j];
                // Debug only
                if (this.options.debug) {
                    Log.info(
                        'Package', "'" + Log.Colors.magenta(config.name.name) + "'",
                        'requires', "'" + Log.Colors.yellow(dep.packageName) + "'",
                        'version', "'" + Log.Colors.yellow(dep.packageVersion.text || 'any') + "'",
                        'theme', "'" + Log.Colors.yellow(dep.packageTheme || 'none') + "'",
                        this.getContextString()
                    );
                }
                var closest = this.findClosestPackage(dep);
                if (closest !== null) {
                    this.mergePackageDependenciesDeclarations(closest);
                    Array.prototype.splice.apply(config.deps, [j, 0].concat(<any[]>closest.deps));
                    j += closest.deps.length;
                    // Debug only
                    if (this.options.debug) {
                        Log.info(
                            'Resolved in package', "'" + Log.Colors.magenta(closest.name.name) + "'",
                            'version', "'" + Log.Colors.yellow(closest.version.text || 'any') + "'",
                            'theme', "'" + Log.Colors.yellow(closest.theme || 'none') + "'"
                        );
                    }
                } else {
                    Log.error(
                        'Dependency', "'" + Log.Colors.red(dep.packageName) + "'",
                        '(version', "'" + Log.Colors.yellow(dep.packageVersion.text || 'any') + "'",
                        'theme', "'" + Log.Colors.yellow(dep.packageTheme || 'none') + "')",
                        'not found for package', "'" + Log.Colors.red(config.name.name) + "'",
                        this.getContextString()
                    );
                }
                this.contextOut();
            }
            config.depsMerged = true;
            this.removePackageDependenciesDuplicates(config);
            this.contextOut(2);
        }

        /**
         * Removes dependencies asking for the same package by keeping the highest version of them.
         *
         * @param PackageFileConfiguration config
         */
        private removePackageDependenciesDuplicates(config: PackageConfiguration): void {
            var indexedCandidates: {[key: string]: PackageConfiguration[]} = {};
            var bestMatches: {[key: string]: PackageDependencyConfiguration} = {};
            var order: string[] = [];

            for (var i = 0; i < config.deps.length; ++i) {
                let packageFile = this.getPackageFileConfigurationById(config.deps[i].packageFileId);
                let pname = config.deps[i].packageName;
                if (packageFile && packageFile.packages[pname]) {
                    for (var j = 0; j < packageFile.packages[pname].length; ++j) {
                        let p = packageFile.packages[pname][j];
                        let lkey = p.name.name+':'+p.theme;
                        let fkey = lkey+'#'+p.packageFileId;
                        let key = !p.name.shared ? fkey : lkey;
                        if (order.indexOf(lkey) < 0) { order.push(lkey) }
                        if (order.indexOf(fkey) < 0) { order.push(fkey) }
                        indexedCandidates[lkey] = Utils.ensureArray(indexedCandidates[lkey]);
                        indexedCandidates[fkey] = Utils.ensureArray(indexedCandidates[fkey]);
                        indexedCandidates[key].push(p);
                    }
                }
            }
            for (var i = 0; i < config.deps.length; ++i) {
                let lkey = config.deps[i].packageName+':'+config.deps[i].packageTheme;
                let fkey = lkey+'#'+config.deps[i].packageFileId;
                let closest = this.findClosestPackage(config.deps[i], Utils.ensureArray(indexedCandidates[lkey]).concat(Utils.ensureArray(indexedCandidates[fkey])));
                if (closest) {
                    let index = closest.name.name +':'+closest.theme+ (!closest.name.shared ? ('#' + config.deps[i].packageFileId) : '');
                    let newDep = Utils.extend({}, config.deps[i], {packageFileId: closest.packageFileId}) as PackageDependencyConfiguration;
                    if (Utils.isSet(bestMatches[index])) {
                        if (config.deps[i].packageVersion.text !== null &&
                            this.compareVersions(closest.version, bestMatches[index].packageVersion) > 0) {
                            bestMatches[index] = newDep;
                        }
                    } else {
                        bestMatches[index] = newDep;
                    }
                }
            }
            config.deps = [];
            for (var i = 0; i < order.length; ++i) {
                if (Utils.isSet(bestMatches[order[i]])) {
                    config.deps.push(bestMatches[order[i]]);
                }
            }
            // Debug only
            if (this.options.debug && config.deps.length) {
                Log.info(
                    'Resolved dependencies for package', "'" + Log.Colors.magenta(config.name.name) + "'",
                    'theme', "'" + Log.Colors.yellow(config.theme || 'none') + "'"
                );
                for (var i = 0; i < config.deps.length; ++i) {
                    let resolved = this.findClosestPackage(config.deps[i]);
                    Log.info(
                        ' - ',
                        'package', "'" + Log.Colors.magenta(resolved.name.name) + "'",
                        'version', "'" + Log.Colors.yellow(resolved.version.text || 'any') + "'",
                        'theme', "'" + Log.Colors.yellow(resolved.theme || 'none') + "'",
                        'fileId', "'" + Log.Colors.yellow(resolved.packageFileId) + "'"
                    );
                }
            }
        }

        /**
         * Try to find the closest package matching a given dependency configuration.
         *
         * @param PackageDependencyConfiguration filters
         * @returns PackageConfiguration
         */
        private findClosestPackage(filters: PackageDependencyConfiguration, candidates: PackageConfiguration[] = null): PackageConfiguration {
            var customCandidates = true;
            if (!Utils.isArray(candidates)) {
                let packageFileConfiguration = this.getPackageFileConfigurationById(filters.packageFileId);
                if (packageFileConfiguration !== null) {
                    candidates = packageFileConfiguration.packages[filters.packageName];
                }
                customCandidates = false;
            }
            if (Utils.isArray(candidates)) {
                var matchingVersion: PackageConfiguration[] = [];

                for (var i = 0; i < candidates.length; ++i) {
                    if ((customCandidates || candidates[i].packageFileId === filters.packageFileId) &&
                        this.compareVersions(candidates[i].version, filters.packageVersion) >= 0) {
                        matchingVersion.push(candidates[i]);
                    }
                }
                if (matchingVersion.length) {
                    matchingVersion.sort((a:PackageConfiguration, b:PackageConfiguration) => {
                        return this.compareVersions(a.version, b.version) * (filters.packageVersion.text !== null ? 1 : -1);
                    });
                    for (var i = 0; i < matchingVersion.length; ++i) {
                        if (matchingVersion[i].theme === filters.packageTheme) {
                            return matchingVersion[i];
                        }
                    }
                    if (filters.packageName !== null && filters.packageTheme !== 'default') {
                        var clone = Utils.extend({}, filters) as PackageDependencyConfiguration;
                        clone.packageTheme = 'default';
                        return this.findClosestPackage(clone);
                    }
                }
            }
            return null;
        }

        /**
         * Resolve and merges imports.
         *
         * @param PackageFileConfiguration conf
         */
        private resolveImports(conf: PackageFileConfiguration): void {
            this.contextIn('imports');
            for (var i = 0; i < conf.imports.length; ++i) {
                var packageFile = new PackageFile(conf.imports[i].absolute, this.options);
                var importConf = packageFile.getPackageFileConfiguration();
                if (importConf !== null) {
                    for (var iname in importConf.packages) {
                        if (importConf.packages.hasOwnProperty(iname)) {
                            if (!Utils.isArray(conf.packages[iname])) {
                                conf.packages[iname] = [];
                            }
                            for (var j = 0; j < importConf.packages[iname].length; ++j) {
                                var incoherentClone = false;
                                var imported = importConf.packages[iname][j];
                                var importedPackageFileId = !imported.name.shared ? imported.packageFileId : this.id;
                                for (var k = 0; k < conf.packages[iname].length; ++k) {
                                    var existing = conf.packages[iname][k];
                                    if (imported.theme === existing.theme && existing.packageFileId === importedPackageFileId &&
                                        this.compareVersions(imported.version, existing.version) === 0) {
                                        incoherentClone = !this.areSamePackages(existing, imported);
                                        break ;
                                    }
                                }
                                if (!incoherentClone) {
                                    let clone = Utils.extend({}, imported) as PackageConfiguration;
                                    clone.packageFileId = importedPackageFileId;
                                    conf.packages[iname].push(clone);
                                } else {
                                    Log.warning(
                                        'Two packages named', "'" + Log.Colors.red(iname) + "'",
                                        '(version', "'"+Log.Colors.yellow(imported.version.text || 'any')+"'",
                                        'theme', "'"+Log.Colors.yellow(imported.theme || 'none')+"')",
                                        "have been found with different content.\n",
                                        'File 1', "'"+Log.Colors.cyan(this.getPackageFilePathById(existing.originalPackageFileId) || 'Unknown')+"'\n",
                                        'File 2', "'"+Log.Colors.cyan(this.getPackageFilePathById(imported.originalPackageFileId) || 'Unknown')+"'\n",
                                        this.getContextString()
                                    );
                                }
                            }
                        }
                        this.normalizePackagesThemes(conf.packages[iname]);
                    }
                }
            }
            this.contextOut();
        }

        /**
         * Try to find a package file configuration by its id.
         *
         * @param number packageFileId
         * @returns string
         */
        private getPackageFileConfigurationById(packageFileId: number): PackageFileConfiguration {
            for (var i = 0; i < loadedConfigurations.length; ++i) {
                if (loadedConfigurations[i].id === packageFileId) {
                    return loadedConfigurations[i];
                }
            }
            return null;
        }

        /**
         * Try to find a package file with the id 'packageFileId' and to return its path.
         *
         * @param number packageFileId
         * @returns string
         */
        private getPackageFilePathById(packageFileId: number): string {
            var conf = this.getPackageFileConfigurationById(packageFileId);
            return conf !== null ? conf.path : null;
        }

        /**
         * TODO: only used to show a warning, so low priority.
         *
         * Test if two packages can be considered having the same configuration.
         *
         * @param PackageConfiguration a
         * @param PackageConfiguration b
         */
        private areSamePackages(a: PackageConfiguration, b: PackageConfiguration): boolean {
            return false;
        }

        /**
         * Test if a string can be accepted as object key.
         *
         * @param string key
         * @returns boolean
         */
        private isValidKey(key: string): boolean {
            // Typescript type hint do not prevent other types to be passed in.
            return Utils.isString(key) && !!key.match(/^[a-z][\w.-]*$/i);
        }

        /**
         * Add a level to the context.
         *
         * @param string|string[] input
         */
        private contextIn(input: string | string[]): void {
            Array.prototype.push.apply(this.context, Utils.ensureArray(input));
        }

        /**
         * Remove the last level of the context.
         *
         * @param number count
         */
        private contextOut(count: number = 1): void {
            count = Math.max(1, count);
            this.context.splice(this.context.length - count, count);
        }

        /**
         * Gets the current context as a string.
         *
         * @returns string
         */
        private getContextString(): string {
            var output = "In '";
            for (var i = 0; i < this.context.length; ++i) {
                output += (i > 0 ? '->' : '') + Log.Colors.magenta(this.context[i]);
            }
            return output + "'.";
        }
    }
}

