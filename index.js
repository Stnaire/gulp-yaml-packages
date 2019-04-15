var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var GP;
(function (GP) {
    var Helpers;
    (function (Helpers) {
        var extend = require('extend');
        var isGlob = require('is-glob');
        var Utils = (function () {
            function Utils() {
            }
            Utils.isObject = function (input) {
                return input !== null && typeof (input) === 'object';
            };
            Utils.isArray = function (input) {
                return Array.isArray(input);
            };
            Utils.isUndefined = function (input) {
                return typeof (input) === 'undefined';
            };
            Utils.isString = function (input, notEmpty) {
                if (notEmpty === void 0) { notEmpty = false; }
                return typeof (input) === 'string' && (!notEmpty || !!Utils.trim(input).length);
            };
            Utils.isSet = function (input) {
                return input !== null && !Utils.isUndefined(input);
            };
            Utils.isGlob = function (input) {
                if (Utils.isString(input)) {
                    return isGlob(input);
                }
                return false;
            };
            Utils.isValidPath = function (input) {
                var reg = /[‘“!#$%&+^<=>`]/;
                return Utils.isString(input) && reg.test(input) && !Utils.isGlob(input);
            };
            Utils.isDefined = function (data, candidates, strict) {
                if (strict === void 0) { strict = true; }
                if (!Utils.isObject(data)) {
                    return false;
                }
                if (!Utils.isArray(candidates)) {
                    candidates = [candidates];
                }
                for (var i = 0; i < candidates.length; ++i) {
                    if (!Utils.isUndefined(data[candidates[i]])) {
                        if (strict !== true) {
                            return true;
                        }
                    }
                    else if (strict === true) {
                        return false;
                    }
                }
                return false;
            };
            Utils.asString = function (input) {
                if (input === void 0) {
                    return '[undefined]';
                }
                if (input === null) {
                    return '[null]';
                }
                if (Utils.isArray(input)) {
                    return '[object Array]';
                }
                return (typeof (input['toString']) === 'function') ? input.toString() : typeof (input);
            };
            Utils.ensureArray = function (input) {
                if (Utils.isArray(input)) {
                    return input;
                }
                if (input === null || Utils.isUndefined(input)) {
                    return [];
                }
                return [input];
            };
            Utils.trim = function (str) {
                return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
            };
            Utils.pad = function (str, nb, c) {
                if (c === void 0) { c = '0'; }
                str = str + '';
                return str.length >= nb ? str : (str + new Array(nb - str.length + 1).join(c));
            };
            Utils.deepCopy = function (input) {
                if (Utils.isObject(input)) {
                    return Utils.extend(true, {}, input);
                }
                return input;
            };
            Utils.extend = function () {
                var objects = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    objects[_i] = arguments[_i];
                }
                return extend.apply(null, objects);
            };
            Utils.clone = function (input) {
                if (Utils.isArray(input)) {
                    return input.slice();
                }
                if (Utils.isObject(input)) {
                    return Utils.deepCopy(input);
                }
                return input;
            };
            Utils.equals = function (a, b) {
                return JSON.stringify(Utils.generateHashData(a)) === JSON.stringify(Utils.generateHashData(b));
            };
            Utils.generateHashData = function (data) {
                if (Utils.isArray(data)) {
                    var output = [];
                    for (var i = 0; i < data.length; ++i) {
                        output.push(Utils.generateHashData(data[i]));
                    }
                    return output;
                }
                else if (Utils.isObject(data)) {
                    var output = [];
                    var keys = Object.keys(data);
                    keys.sort();
                    for (var i = 0; i < keys.length; ++i) {
                        var k = keys[i];
                        var obj = {};
                        obj[k] = Utils.generateHashData(data[k]);
                        output.push(obj);
                    }
                    return output;
                }
                if (Utils.isString(data)) {
                    return Utils.slugify(data);
                }
                return data;
            };
            Utils.slugify = function (text) {
                return text.toString().toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^\w\-]+/g, '')
                    .replace(/\-\-+/g, '-')
                    .replace(/^-+/, '')
                    .replace(/-+$/, '');
            };
            return Utils;
        }());
        Helpers.Utils = Utils;
    })(Helpers = GP.Helpers || (GP.Helpers = {}));
})(GP || (GP = {}));
var GP;
(function (GP) {
    var Helpers;
    (function (Helpers) {
        var fs = require('fs');
        var fspath = require('path');
        var jsYaml = require('js-yaml');
        var FileSystem = (function () {
            function FileSystem() {
            }
            FileSystem.fileExists = function (path) {
                try {
                    return fs.statSync(path).isFile();
                }
                catch (e) {
                    return false;
                }
            };
            FileSystem.isDirectory = function (path) {
                var stats = fs.lstatSync(path);
                return stats && stats.isDirectory();
            };
            FileSystem.getExtension = function (path) {
                var ext = fspath.extname(path).toLowerCase();
                if (ext.length < 2 || ext[1] === '{') {
                    return null;
                }
                return ext && ext[0] === '.' ? ext.substring(1) : ext;
            };
            FileSystem.getAbsolutePath = function (path, from, ensureExists) {
                if (from === void 0) { from = ''; }
                if (ensureExists === void 0) { ensureExists = false; }
                var resolved = fspath.resolve(from, path);
                return !ensureExists || FileSystem.fileExists(resolved) ? resolved : null;
            };
            FileSystem.getFileContent = function (path) {
                if (FileSystem.fileExists(path)) {
                    return fs.readFileSync(path, 'utf-8');
                }
                Helpers.Log.error('File', Helpers.Log.Colors.red(path), 'does not exist.');
                return null;
            };
            FileSystem.getYamlFileContent = function (path) {
                try {
                    var content = FileSystem.getFileContent(path);
                    if (content !== null) {
                        return jsYaml.safeLoad(content);
                    }
                }
                catch (e) {
                    Helpers.Log.error('Failed to read YAML file', Helpers.Log.Colors.magenta(path) + '.', 'Reason:', Helpers.Log.Colors.red(e.toString()));
                }
                return null;
            };
            FileSystem.getRelativePath = function (from, to) {
                return fspath.relative(from, to);
            };
            FileSystem.getDirectoryName = function (path) {
                return fspath.dirname(path);
            };
            Object.defineProperty(FileSystem, "separator", {
                get: function () {
                    return fspath.sep;
                },
                enumerable: true,
                configurable: true
            });
            return FileSystem;
        }());
        Helpers.FileSystem = FileSystem;
    })(Helpers = GP.Helpers || (GP.Helpers = {}));
})(GP || (GP = {}));
var GP;
(function (GP) {
    var Helpers;
    (function (Helpers) {
        var gutil = require('gulp-util');
        var Log = (function () {
            function Log() {
            }
            Log.info = function () {
                var messages = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    messages[_i] = arguments[_i];
                }
                gutil.log.apply(null, messages);
            };
            Log.warning = function () {
                var messages = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    messages[_i] = arguments[_i];
                }
                messages.unshift(gutil.colors.bgYellow.black('! WARNING !'));
                gutil.log.apply(null, messages);
            };
            Log.error = function () {
                var messages = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    messages[_i] = arguments[_i];
                }
                messages.unshift(gutil.colors.bgRed.black('! ERROR !'));
                gutil.log.apply(null, messages);
            };
            Log.fatal = function () {
                var messages = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    messages[_i] = arguments[_i];
                }
                messages.unshift(gutil.colors.bgYellow.black('! gulp-packages stops !'));
                messages.unshift(gutil.colors.bgRed.black('!! FATAL ERROR !!'));
                gutil.log.apply(null, messages);
                throw new GP.StopException();
            };
            Log.Colors = gutil.colors;
            return Log;
        }());
        Helpers.Log = Log;
    })(Helpers = GP.Helpers || (GP.Helpers = {}));
})(GP || (GP = {}));
var GP;
(function (GP) {
    var StopException = (function (_super) {
        __extends(StopException, _super);
        function StopException() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return StopException;
    }(Error));
    GP.StopException = StopException;
})(GP || (GP = {}));
var GP;
(function (GP) {
    var FileSystem = GP.Helpers.FileSystem;
    var Utils = GP.Helpers.Utils;
    var Log = GP.Helpers.Log;
    var plumber = require('gulp-plumber');
    var ProcessorsManager = (function () {
        function ProcessorsManager() {
            this.configurations = {};
            this.callbacks = this.getBaseCallbacks();
            this.baseConfigurations = this.getBaseConfigurations();
            this.baseExecutionOrder = this.getBaseExecutionOrder();
        }
        ProcessorsManager.prototype.register = function (name, callback) {
            this.callbacks[name] = callback;
        };
        ProcessorsManager.prototype.registerDefaultConfigurations = function (packageFileId, configurations) {
            this.configurations[packageFileId] = configurations;
        };
        ProcessorsManager.prototype.resolve = function (path, packageId, specificConf) {
            if (packageId === void 0) { packageId = -1; }
            if (specificConf === void 0) { specificConf = {}; }
            var ext = FileSystem.getExtension(path);
            var output = {
                executionOrder: this.baseExecutionOrder.slice(),
                processors: {}
            };
            for (var pname in this.baseConfigurations) {
                if (this.baseConfigurations.hasOwnProperty(pname)) {
                    if (this.baseConfigurations[pname].extensions.indexOf(ext) >= 0) {
                        var cname = this.baseConfigurations[pname].callback;
                        output.processors[cname] = Utils.clone(this.baseConfigurations[pname].options);
                    }
                }
            }
            if (packageId > 0 && Utils.isArray(this.configurations[packageId])) {
                var subOrder = [];
                for (var i = 0; i < this.configurations[packageId].length; ++i) {
                    var conf = this.configurations[packageId][i];
                    var pos = output.executionOrder.indexOf(conf.callback);
                    if (pos < 0) {
                        subOrder.push(conf.callback);
                    }
                    else if (subOrder.length) {
                        Array.prototype.splice.apply(output.executionOrder, [pos, 0].concat(subOrder));
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
                var resolved = this.getConfigurationByName(pname, packageId);
                if (resolved !== null) {
                    output.processors[resolved.callback] = Utils.clone(resolved.options);
                }
                else {
                    output.processors[pname] = Utils.clone(specificConf[pname]);
                }
            }
            return output;
        };
        ProcessorsManager.prototype.equals = function (a, b) {
            var isEmpty = function (i) {
                return i === null || !Object.keys(i.processors).length;
            };
            if (isEmpty(a) && isEmpty(b)) {
                return true;
            }
            if (isEmpty(a) || isEmpty(b)) {
                return false;
            }
            return Utils.equals(a.processors, b.processors);
        };
        ProcessorsManager.prototype.execute = function (name, options, stream) {
            if (Utils.isSet(this.callbacks[name])) {
                return this.callbacks[name].apply(null, [stream, options]);
            }
            else {
                Log.fatal('Processor', "'" + Log.Colors.red(name) + "'", 'does not exist.');
            }
        };
        ProcessorsManager.prototype.getConfigurationByName = function (name, packageId) {
            if (packageId === void 0) { packageId = -1; }
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
        };
        ProcessorsManager.prototype.getBaseCallbacks = function () {
            return {
                typescript: function (stream, options) {
                    return stream.pipe(ProcessorsManager.require('gulp-typescript')(options)).js;
                },
                coffee: function (stream, options) {
                    return stream.pipe(ProcessorsManager.require('gulp-coffee')(options));
                },
                sass: function (stream, options) {
                    return stream.pipe(ProcessorsManager.require('gulp-sass')(options));
                },
                less: function (stream, options) {
                    return stream.pipe(ProcessorsManager.require('gulp-less')(options));
                },
                cssurladjuster: function (stream, options) {
                    return stream.pipe(ProcessorsManager.require('gulp-css-url-adjuster')(options));
                },
                image: function (stream, options) {
                    return stream.pipe(ProcessorsManager.require('gulp-image-optimization')(options));
                }
            };
        };
        ProcessorsManager.prototype.getBaseConfigurations = function () {
            return {
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
        };
        ProcessorsManager.prototype.getBaseExecutionOrder = function () {
            return ['typescript', 'coffee', 'sass', 'less', 'cssurladjuster', 'image'];
        };
        ProcessorsManager.require = function (name) {
            if (!Utils.isSet(ProcessorsManager.modules[name])) {
                ProcessorsManager.modules[name] = require(name);
            }
            return ProcessorsManager.modules[name];
        };
        ProcessorsManager.modules = {};
        return ProcessorsManager;
    }());
    GP.ProcessorsManager = ProcessorsManager;
})(GP || (GP = {}));
var GP;
(function (GP) {
    var FileSystem = GP.Helpers.FileSystem;
    var Utils = GP.Helpers.Utils;
    var Log = GP.Helpers.Log;
    var loadedConfigurationsMaxId = 0;
    var loadedConfigurations = [];
    var loadingStack = [];
    var PackageFile = (function () {
        function PackageFile(path, options) {
            this.path = path;
            this.options = options;
            this.context = [];
            this.id = ++loadedConfigurationsMaxId;
            this.path = FileSystem.getAbsolutePath(path);
            this.dirname = FileSystem.getDirectoryName(this.path);
            this.contextIn(FileSystem.getRelativePath(__dirname, this.path));
            this.load();
        }
        PackageFile.prototype.getGulpfileConfiguration = function () {
            if (!this.gulpfileConfiguration) {
                var packages = [];
                var processors = new GP.ProcessorsManager();
                for (var i = 0; i < loadedConfigurations.length; ++i) {
                    processors.registerDefaultConfigurations(loadedConfigurations[i].id, loadedConfigurations[i].processors);
                }
                for (var pname in this.configuration.packages) {
                    this.contextIn(pname);
                    if (this.configuration.packages.hasOwnProperty(pname)) {
                        for (var i = 0; i < this.configuration.packages[pname].length; ++i) {
                            var p = this.createGulpfilePackage(this.configuration.packages[pname][i]);
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
        };
        PackageFile.prototype.createGulpfilePackage = function (configuration) {
            if (!configuration.standalone) {
                return null;
            }
            var resolved = [];
            var misc = (configuration.misc || []).slice();
            for (var i = 0; i < configuration.deps.length; ++i) {
                var res = this.findClosestPackage(configuration.deps[i]);
                if (res !== null) {
                    if (Utils.isSet(res['misc'])) {
                        Array.prototype.push.apply(misc, res['misc']);
                    }
                    resolved.push(res);
                }
            }
            var output = {
                name: configuration.name.name,
                theme: configuration.theme,
                version: configuration.version.text,
                scripts: this.mergeDependencies('scripts', configuration.scripts, resolved),
                styles: this.mergeDependencies('styles', configuration.styles, resolved),
                misc: misc
            };
            return output.scripts || output.styles || (output.misc && output.misc.length) ? output : null;
        };
        PackageFile.prototype.mergeDependencies = function (type, configuration, deps) {
            var output = {
                watch: [],
                input: [],
                autoWatch: configuration ? configuration.autoWatch : undefined,
                output: configuration && configuration.output ? Utils.extend({}, configuration.output) : null
            };
            for (var i = 0; i < deps.length; ++i) {
                var dep = deps[i][type];
                if (Utils.isSet(dep)) {
                    Array.prototype.push.apply(output.watch, dep.watch);
                    Array.prototype.push.apply(output.input, dep.input);
                    if (output.output === null && dep.output) {
                        output.output = Utils.clone(dep.output);
                    }
                }
            }
            if (output.output !== null) {
                if (configuration !== null) {
                    Array.prototype.push.apply(output.watch, configuration.watch);
                    Array.prototype.push.apply(output.input, configuration.input);
                }
            }
            else if (this.options.strict && configuration && configuration.input.length) {
                Log.warning('Input', "'" + Log.Colors.red(type) + "'", 'have been defined with no output.', this.getContextString());
            }
            return output.output !== null && output.input.length ? output : null;
        };
        PackageFile.prototype.getPackageFileConfiguration = function () {
            return this.configuration;
        };
        PackageFile.prototype.load = function () {
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
        };
        PackageFile.prototype.loadFromCache = function () {
            for (var i = 0; i < loadedConfigurations.length; ++i) {
                if (loadedConfigurations[i].path === this.path) {
                    this.configuration = Utils.extend({}, loadedConfigurations[i]);
                    return true;
                }
            }
            return false;
        };
        PackageFile.prototype.registerInCache = function (configuration) {
            if (isNaN(configuration.id) || configuration.id <= 0) {
                throw "A PackageFileConfiguration must have an id in order to be cached.";
            }
            for (var i = 0; i < loadedConfigurations.length; ++i) {
                if (loadedConfigurations[i].id === configuration.id) {
                    if (loadedConfigurations[i].path !== configuration.path) {
                        throw "A different PackageFileConfiguration has already been registered with the id '" + configuration.id + "'.";
                    }
                    return;
                }
            }
            loadedConfigurations.push(configuration);
        };
        PackageFile.prototype.checkForCircularDependency = function () {
            if (loadingStack.indexOf(this.path) >= 0) {
                var messages = [
                    'Circular dependency detected when importing',
                    "'" + Log.Colors.red(this.path) + "'.",
                    "Details of the stack :\n"
                ];
                for (var j = 0; j < loadingStack.length; ++j) {
                    if (loadingStack[j] === this.path) {
                        Array.prototype.push.apply(messages, [Log.Colors.bgRed.black(' ! '), Log.Colors.red(loadingStack[j]) + "\n"]);
                    }
                    else {
                        Array.prototype.push.apply(messages, ['OK', Log.Colors.magenta(loadingStack[j]) + "\n"]);
                    }
                }
                messages.push(Log.Colors.bgRed.black(' ! ') + ' ' + Log.Colors.red(this.path) + "\n");
                Log.warning.apply(null, messages);
            }
        };
        PackageFile.prototype.normalize = function (raw) {
            var parameters = this.normalizeParameters(raw.parameters);
            parameters._theme = this.options.theme;
            parameters._env = this.options.env;
            while (this.resolveParameters(parameters, parameters))
                ;
            while (this.resolveParameters(parameters, raw))
                ;
            return {
                id: this.id,
                path: this.path,
                parameters: parameters,
                processors: this.normalizeProcessors(raw.processors),
                packages: this.normalizePackages(raw.packages),
                imports: this.normalizeImports(raw.imports)
            };
        };
        PackageFile.prototype.normalizeParameters = function (raw) {
            var output = {};
            if (!Utils.isObject(raw)) {
                return output;
            }
            this.contextIn('parameters');
            for (var i in raw) {
                if (raw.hasOwnProperty(i)) {
                    if (this.isValidKey(i)) {
                        if ((/string|number/).test(typeof (raw[i]))) {
                            output[i] = raw[i];
                        }
                        else if (this.options.verbose) {
                            Log.error('Invalid parameter value for', "'" + Log.Colors.yellow(i) + "'", "(type '" + Log.Colors.red(Utils.asString(raw[i])) + "').", this.getContextString());
                        }
                    }
                    else if (this.options.verbose) {
                        Log.error('Invalid parameter name', "'" + Log.Colors.red(Utils.asString(i)) + "'.", this.getContextString());
                    }
                }
            }
            this.contextOut();
            return output;
        };
        PackageFile.prototype.normalizeProcessors = function (raw) {
            var output = [];
            if (!Utils.isObject(raw)) {
                return output;
            }
            this.contextIn('processors');
            if (!Utils.isArray(raw)) {
                raw = [raw];
            }
            for (var i = 0; i < raw.length; ++i) {
                this.contextIn(i.toString());
                if (Utils.isString(raw[i])) {
                    raw[i] = { name: raw[i] };
                }
                if (!Utils.isArray(raw[i]) && Utils.isObject(raw[i])) {
                    var processor = {
                        name: raw[i].name,
                        callback: raw[i].callback || raw[i].name,
                        extensions: this.normalizeExtensions(raw[i].extensions),
                        options: raw[i].options || {}
                    };
                    if (Utils.isString(processor.name) && processor.name) {
                        if (processor.callback.match(/^[$a-z_]\w*$/i)) {
                            output.push(processor);
                        }
                        else {
                            Log.error('Invalid processor callback', "'" + Log.Colors.red(Utils.asString(processor.callback)) + "'.", 'Should be a valid function name.', this.getContextString());
                        }
                    }
                    else {
                        Log.error('Invalid processor name', "'" + Log.Colors.red(Utils.asString(processor.name)) + "'.", this.getContextString());
                    }
                }
                else {
                    Log.error('Invalid processor value', "'" + Log.Colors.red(Utils.asString(raw[i])) + "'.", this.getContextString());
                }
                this.contextOut();
            }
            this.contextOut();
            return output;
        };
        PackageFile.prototype.normalizePackages = function (raw) {
            var output = {};
            if (!Utils.isObject(raw)) {
                return output;
            }
            this.contextIn('packages');
            var flattened = this.flattenPackages(raw);
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
                            this.normalizePackagesThemes(output[normalized.name.name]);
                        }
                        this.contextOut();
                    }
                    this.contextOut();
                }
            }
            this.contextOut();
            return output;
        };
        PackageFile.prototype.normalizePackage = function (name, raw) {
            if (!Utils.isObject(raw)) {
                return null;
            }
            var normalizedName = this.normalizePackageName(name);
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
        };
        PackageFile.prototype.normalizePackageName = function (raw) {
            if (!Utils.isString(raw, true) || !raw.match(/^@?\D[\w.-]*$/i)) {
                Log.error('Invalid package name', "'" + Log.Colors.red(Utils.asString(raw)) + "'.", this.getContextString());
                return null;
            }
            var shared = raw[0] !== '@';
            return {
                name: !shared ? raw.substring(1) : raw,
                shared: shared
            };
        };
        PackageFile.prototype.normalizePackageVersion = function (raw) {
            if (!Utils.isString(raw, true) && isNaN(raw)) {
                return {
                    text: null,
                    components: []
                };
            }
            raw = raw + '';
            var output = { text: Utils.trim(raw), components: [] };
            var parts = raw.split('.');
            for (var i = 0; i < parts.length; ++i) {
                var nb = parseInt(parts[i], 10);
                if (isNaN(nb)) {
                    nb = 0;
                    Log.error('Invalid version number component', "'" + Log.Colors.red(Utils.asString(parts[i])) + "'", 'for version', "'" + Log.Colors.yellow(raw) + "'.", 'Only numerical components are supported.', this.getContextString());
                }
                output.components.push(nb);
            }
            return output;
        };
        PackageFile.prototype.normalizePackageTheme = function (raw) {
            if (Utils.isUndefined(raw)) {
                return null;
            }
            if (!Utils.isString(raw, true)) {
                return 'default';
            }
            return Utils.trim(raw);
        };
        PackageFile.prototype.normalizePackagesThemes = function (packages) {
            var hasTheme = false;
            for (var i = 0; i < packages.length; ++i) {
                if (packages[i].theme !== null) {
                    hasTheme = true;
                    break;
                }
            }
            for (var i = 0; i < packages.length; ++i) {
                packages[i].theme = hasTheme ? (packages[i].theme || 'default') : null;
            }
        };
        PackageFile.prototype.normalizePackageInputOutput = function (type, raw) {
            var _this = this;
            var output = null;
            if (!Utils.isSet(raw)) {
                return null;
            }
            if (Utils.isString(raw)) {
                raw = { input: [raw] };
            }
            this.contextIn(type);
            if (Utils.isDefined(raw, ['input', 'output'], false)) {
                output = {
                    watch: Utils.ensureArray(raw['watch']).map(function (i) { return _this.normalizePath(i); }),
                    input: this.normalizePackageInput(raw['input']),
                    output: this.normalizePackageOutput(raw['output'])
                };
                if (!Utils.isUndefined(raw['autoWatch'])) {
                    output.autoWatch = !!raw['autoWatch'];
                }
            }
            else {
                Log.error('Invalid value', "'" + Log.Colors.red(Utils.asString(raw)) + "'.", 'An object with an input and/or an output key is expected.', this.getContextString());
            }
            this.contextOut();
            return output;
        };
        PackageFile.prototype.normalizePackageMultipleInputOutput = function (type, raw) {
            var output = [];
            if (!Utils.isSet(raw)) {
                return null;
            }
            raw = Utils.ensureArray(raw);
            this.contextIn(type);
            for (var i = 0; i < raw.length; ++i) {
                this.contextIn(i.toString());
                var normalized = this.normalizePackageInputOutput(type, raw[i]);
                if (normalized !== null) {
                    output.push(normalized);
                }
                this.contextOut();
            }
            this.contextOut();
            return output;
        };
        PackageFile.prototype.normalizePackageInput = function (raw) {
            var output = [];
            if (!Utils.isUndefined(raw)) {
                this.contextIn('input');
                var inputArray = Utils.ensureArray(raw);
                for (var i = 0; i < inputArray.length; ++i) {
                    var rawInput = inputArray[i];
                    var normalizedInput = { files: [], processors: {} };
                    this.contextIn(i.toString());
                    if (Utils.isString(rawInput)) {
                        rawInput = [rawInput];
                    }
                    if (Utils.isArray(rawInput)) {
                        normalizedInput.files = rawInput;
                    }
                    else if (Utils.isObject(rawInput)) {
                        normalizedInput.files = Utils.ensureArray(rawInput.files);
                        if (Utils.isString(rawInput.processors)) {
                            rawInput.processors = [rawInput.processors];
                        }
                        if (Utils.isArray(rawInput.processors)) {
                            for (var j = 0; j < rawInput.processors.length; ++j) {
                                if (Utils.isString(rawInput.processors[j], true)) {
                                    normalizedInput.processors[rawInput.processors[j]] = null;
                                }
                                else {
                                    Log.error('Invalid processor name', "'" + Log.Colors.red(Utils.asString(rawInput.processors[j])) + "'.", this.getContextString());
                                }
                            }
                        }
                        else if (Utils.isObject(rawInput.processors)) {
                            for (var name_1 in rawInput.processors) {
                                if (rawInput.processors.hasOwnProperty(name_1)) {
                                    if (Utils.isObject(rawInput.processors[name_1])) {
                                        normalizedInput.processors[name_1] = rawInput.processors[name_1];
                                    }
                                    else {
                                        normalizedInput.processors[name_1] = {};
                                        if (Utils.isSet(rawInput.processors[name_1])) {
                                            Log.error('Invalid options', "'" + Log.Colors.red(Utils.asString(rawInput.processors[name_1])) + "'", 'for processor', "'" + Log.Colors.cyan(name_1) + "'.", 'You should define an object or null (~ in yaml).', this.getContextString());
                                        }
                                    }
                                }
                            }
                        }
                    }
                    for (var j = 0; j < normalizedInput.files.length; ++j) {
                        var path = this.normalizePath(normalizedInput.files[j]);
                        if (path !== null) {
                            normalizedInput.files[j] = path;
                        }
                        else {
                            normalizedInput.files.splice(j--, 1);
                        }
                    }
                    output.push(normalizedInput);
                    this.contextOut();
                }
                this.contextOut();
            }
            return output;
        };
        PackageFile.prototype.normalizePackageOutput = function (raw) {
            var output = { dev: null, prod: null };
            if (!Utils.isUndefined(raw)) {
                this.contextIn('output');
                if (Utils.isString(raw)) {
                    var path = this.normalizePath(raw);
                    output = { dev: path, prod: path };
                }
                else if (Utils.isObject(raw)) {
                    var dev = this.normalizePath(raw['dev']);
                    var prod = this.normalizePath(raw['prod']);
                    output = { dev: dev || prod, prod: prod || dev };
                }
                this.contextOut();
            }
            return output.dev !== null && output.prod !== null ? output : null;
        };
        PackageFile.prototype.normalizePackageDependencies = function (raw) {
            var output = [];
            this.contextIn('deps');
            raw = Utils.ensureArray(raw);
            for (var i = 0; i < raw.length; ++i) {
                this.contextIn(i.toString());
                if (!Utils.isString(raw[i], true)) {
                    Log.error('Invalid dependency', "'" + Log.Colors.red(Utils.asString(raw[i])) + "'.", 'A string is expected.', this.getContextString());
                    continue;
                }
                var match = raw[i].match(/^(.*\.(?:yml|yaml))#([\w.-]+)(?::([\w.-]+))?(?:#([\w.-]+))?$/i);
                if (match !== null) {
                    var path = this.normalizePath(match[1]);
                    var packageFile = new PackageFile(path.absolute, this.options);
                    var packageFileConf = packageFile.getPackageFileConfiguration();
                    if (Utils.isSet(packageFileConf)) {
                        output.push({
                            packageFileId: packageFileConf.id,
                            packageName: match[2],
                            packageTheme: this.normalizePackageTheme(match[3]),
                            packageVersion: this.normalizePackageVersion(match[4])
                        });
                    }
                    else {
                        Log.error('Failed to load package file', "'" + Log.Colors.red(path.absolute) + "'.", this.getContextString());
                    }
                }
                else {
                    match = raw[i].match(/^(\D[\w.-]*)(?::([\w.-]+))?(?:#([\w.-]+))?$/i);
                    if (match !== null) {
                        var depPackageFileId = this.id;
                        for (var i_1 = 0; i_1 < loadedConfigurations.length; ++i_1) {
                            if (!Utils.isUndefined(loadedConfigurations[i_1].packages[match[1]])) {
                                depPackageFileId = loadedConfigurations[i_1].id;
                                break;
                            }
                        }
                        output.push({
                            packageFileId: depPackageFileId,
                            packageName: match[1],
                            packageTheme: this.normalizePackageTheme(match[2]),
                            packageVersion: this.normalizePackageVersion(match[3])
                        });
                    }
                    else {
                        Log.error('Invalid dependency', "'" + Log.Colors.red(Utils.asString(raw[i])) + "'.", 'Syntax error, please refer to the documentation.', this.getContextString());
                    }
                }
                this.contextOut();
            }
            this.contextOut();
            return output;
        };
        PackageFile.prototype.normalizeImports = function (raw) {
            var output = [];
            if (Utils.isSet(raw)) {
                if (!Utils.isArray(raw)) {
                    raw = [raw];
                }
                for (var i = 0; i < raw.length; ++i) {
                    if (Utils.isString(raw[i], true)) {
                        var path = this.normalizePath(raw[i], true);
                        if (path !== null) {
                            output.push(path);
                        }
                    }
                    else {
                        Log.error('Invalid import value', "'" + Log.Colors.red(Utils.asString(raw[i])) + "' (should be a string).", this.getContextString());
                    }
                }
            }
            return output;
        };
        PackageFile.prototype.normalizeExtensions = function (raw) {
            var output = [];
            this.contextIn('extensions');
            if (!Utils.isUndefined(raw)) {
                if (!Utils.isArray(raw)) {
                    raw = [raw];
                }
                for (var i = 0; i < raw.length; ++i) {
                    this.contextIn(i.toString());
                    if (Utils.isString(raw[i]) && raw[i].match(/^[a-z.][a-z0-9]*$/i)) {
                        output.push((raw[i][0] === '.' ? raw[i].substring(1) : raw[i]).toLowerCase());
                    }
                    else if (this.options.verbose) {
                        Log.error('Invalid extension', "'" + Log.Colors.red(Utils.asString(raw[i])) + "'.", this.getContextString());
                    }
                    this.contextOut();
                }
            }
            this.contextOut();
            return output;
        };
        PackageFile.prototype.resolveParameters = function (parameters, input) {
            var changed = false;
            if (Utils.isObject(input)) {
                for (var i in input) {
                    if (input.hasOwnProperty(i)) {
                        if (Utils.isString(input[i])) {
                            var reg = new RegExp('%([^%]+)%', 'g');
                            var match = null;
                            while ((match = reg.exec(input[i]))) {
                                if (!Utils.isUndefined(parameters[match[1]])) {
                                    var repReg = new RegExp(match[0], 'g');
                                    input[i] = input[i].replace(repReg, parameters[match[1]]);
                                    changed = true;
                                }
                            }
                        }
                        else {
                            changed = this.resolveParameters(parameters, input[i]) || changed;
                        }
                    }
                }
            }
            return changed;
        };
        PackageFile.prototype.flattenPackages = function (data, name) {
            if (name === void 0) { name = ''; }
            var output = {};
            var keys = ['scripts', 'styles', 'misc', 'deps'];
            if (Utils.isArray(data) || !Utils.isObject(data)) {
                return null;
            }
            for (var i in data) {
                if (data.hasOwnProperty(i)) {
                    var dataArray = Utils.ensureArray(data[i]);
                    var lname = name + ((name !== '') ? '.' : '');
                    if (i[0] === '@') {
                        lname = (lname[0] !== '@' ? '@' : '') + lname + i.substring(1);
                    }
                    else {
                        lname += i;
                    }
                    for (var j = 0; j < dataArray.length; ++j) {
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
                        var res = this.flattenPackages(data[i], lname);
                        if (res !== null) {
                            Utils.extend(output, res);
                        }
                    }
                }
            }
            return output;
        };
        PackageFile.prototype.normalizePath = function (input, ensureExistence) {
            if (ensureExistence === void 0) { ensureExistence = false; }
            if (Utils.isSet(input)) {
                var isGlob = Utils.isGlob(input);
                var globBase = '';
                var original = Utils.trim(Utils.asString(input));
                var absolute = FileSystem.getAbsolutePath(original, this.dirname);
                if (ensureExistence && !isGlob && !FileSystem.fileExists(absolute)) {
                    Log.warning('File', "'" + Log.Colors.red(absolute) + "'", 'not found.', this.getContextString());
                    return null;
                }
                if (isGlob) {
                    var pos = absolute.indexOf(FileSystem.separator + '**');
                    if (pos >= 0) {
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
        };
        PackageFile.prototype.compareVersions = function (a, b) {
            var swap = a.components.length < b.components.length;
            var a1 = swap ? b : a;
            var b1 = swap ? a : b;
            for (var i = 0; i < a1.components.length; ++i) {
                var av = a1.components[i];
                var bv = i < b1.components.length ? b1.components[i] : 0;
                if (av > bv) {
                    return swap ? -1 : 1;
                }
                else if (av < bv) {
                    return swap ? 1 : -1;
                }
            }
            return 0;
        };
        PackageFile.prototype.mergeDependenciesDeclarations = function (config) {
            for (var name_2 in config.packages) {
                this.contextIn(['packages', name_2]);
                if (config.packages.hasOwnProperty(name_2)) {
                    for (var i = 0; i < config.packages[name_2].length; ++i) {
                        this.mergePackageDependenciesDeclarations(config.packages[name_2][i]);
                    }
                }
                this.contextOut(2);
            }
        };
        PackageFile.prototype.mergePackageDependenciesDeclarations = function (config, stack) {
            if (stack === void 0) { stack = []; }
            if (config.depsMerged) {
                return;
            }
            this.contextIn([config.name.name, 'deps']);
            for (var j = 0; j < config.deps.length; ++j) {
                this.contextIn(j.toString());
                var dep = config.deps[j];
                var closest = this.findClosestPackage(dep);
                if (this.options.debug) {
                    Log.info('Package', "'" + Log.Colors.magenta(config.name.name) + "'", 'requires', "'" + Log.Colors.yellow(dep.packageName) + "'", 'version', "'" + Log.Colors.yellow(dep.packageVersion.text || 'any') + "'", 'theme', "'" + Log.Colors.yellow(dep.packageTheme || 'none') + "'", this.getContextString());
                }
                if (closest !== null) {
                    var str = this.getPackageStringRepresentation(closest);
                    if (stack.indexOf(str) < 0) {
                        stack.push(str);
                        this.mergePackageDependenciesDeclarations(closest, stack);
                        Array.prototype.splice.apply(config.deps, [j, 0].concat(closest.deps));
                        j += closest.deps.length;
                        stack.pop();
                        if (this.options.debug) {
                            Log.info('Resolved in package', "'" + Log.Colors.magenta(closest.name.name) + "'", 'version', "'" + Log.Colors.yellow(closest.version.text || 'any') + "'", 'theme', "'" + Log.Colors.yellow(closest.theme || 'none') + "'");
                        }
                    }
                    else {
                        var messages = [
                            'Circular dependency detected in',
                            "'" + Log.Colors.red(this.path) + "'.",
                            "Details of the stack :\n"
                        ];
                        for (var j_1 = 0; j_1 < stack.length; ++j_1) {
                            if (stack[j_1] === str) {
                                Array.prototype.push.apply(messages, [Log.Colors.bgRed.black(' ! '), Log.Colors.red(stack[j_1]) + "\n"]);
                            }
                            else {
                                Array.prototype.push.apply(messages, ['OK', Log.Colors.magenta(stack[j_1]) + "\n"]);
                            }
                        }
                        messages.push(Log.Colors.bgRed.black(' ! ') + ' ' + Log.Colors.red(str) + "\n");
                        Log.warning.apply(null, messages);
                    }
                }
                else {
                    Log.error('Dependency ', "'" + Log.Colors.red(dep.packageName) + "'", '(version', "'" + Log.Colors.yellow(dep.packageVersion.text || 'any') + "'", 'theme', "'" + Log.Colors.yellow(dep.packageTheme || 'none') + "')", 'not found for package', "'" + Log.Colors.red(config.name.name) + "'", this.getContextString());
                }
                this.contextOut();
            }
            config.depsMerged = true;
            this.removePackageDependenciesDuplicates(config);
            this.contextOut(2);
        };
        PackageFile.prototype.removePackageDependenciesDuplicates = function (config) {
            var indexedCandidates = {};
            var bestMatches = {};
            var order = [];
            for (var i = 0; i < config.deps.length; ++i) {
                var packageFile = this.getPackageFileConfigurationById(config.deps[i].packageFileId);
                var pname = config.deps[i].packageName;
                if (packageFile && packageFile.packages[pname]) {
                    for (var j = 0; j < packageFile.packages[pname].length; ++j) {
                        var p = packageFile.packages[pname][j];
                        var lkey = p.name.name + ':' + p.theme;
                        var fkey = lkey + '#' + p.packageFileId;
                        var key = !p.name.shared ? fkey : lkey;
                        if (order.indexOf(lkey) < 0) {
                            order.push(lkey);
                        }
                        if (order.indexOf(fkey) < 0) {
                            order.push(fkey);
                        }
                        indexedCandidates[lkey] = Utils.ensureArray(indexedCandidates[lkey]);
                        indexedCandidates[fkey] = Utils.ensureArray(indexedCandidates[fkey]);
                        indexedCandidates[key].push(p);
                    }
                }
            }
            for (var i = 0; i < config.deps.length; ++i) {
                var lkey = config.deps[i].packageName + ':' + config.deps[i].packageTheme;
                var fkey = lkey + '#' + config.deps[i].packageFileId;
                var closest = this.findClosestPackage(config.deps[i], Utils.ensureArray(indexedCandidates[lkey]).concat(Utils.ensureArray(indexedCandidates[fkey])));
                if (closest) {
                    var index = closest.name.name + ':' + closest.theme + (!closest.name.shared ? ('#' + config.deps[i].packageFileId) : '');
                    var newDep = Utils.extend({}, config.deps[i], { packageFileId: closest.packageFileId });
                    if (Utils.isSet(bestMatches[index])) {
                        if (config.deps[i].packageVersion.text !== null &&
                            this.compareVersions(closest.version, bestMatches[index].packageVersion) > 0) {
                            bestMatches[index] = newDep;
                        }
                    }
                    else {
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
            if (this.options.debug && config.deps.length) {
                Log.info('Resolved dependencies for package', "'" + Log.Colors.magenta(config.name.name) + "'", 'theme', "'" + Log.Colors.yellow(config.theme || 'none') + "'");
                for (var i = 0; i < config.deps.length; ++i) {
                    var resolved = this.findClosestPackage(config.deps[i]);
                    Log.info(' - ', 'package', "'" + Log.Colors.magenta(resolved.name.name) + "'", 'version', "'" + Log.Colors.yellow(resolved.version.text || 'any') + "'", 'theme', "'" + Log.Colors.yellow(resolved.theme || 'none') + "'", 'fileId', "'" + Log.Colors.yellow(resolved.packageFileId) + "'");
                }
            }
        };
        PackageFile.prototype.findClosestPackage = function (filters, candidates) {
            var _this = this;
            if (candidates === void 0) { candidates = null; }
            var customCandidates = true;
            if (!Utils.isArray(candidates)) {
                var packageFileConfiguration = this.getPackageFileConfigurationById(filters.packageFileId);
                if (packageFileConfiguration !== null) {
                    candidates = packageFileConfiguration.packages[filters.packageName];
                }
                customCandidates = false;
            }
            if (Utils.isArray(candidates)) {
                var matchingVersion = [];
                for (var i = 0; i < candidates.length; ++i) {
                    if ((customCandidates || candidates[i].packageFileId === filters.packageFileId) &&
                        this.compareVersions(candidates[i].version, filters.packageVersion) >= 0) {
                        matchingVersion.push(candidates[i]);
                    }
                }
                if (matchingVersion.length) {
                    matchingVersion.sort(function (a, b) {
                        return _this.compareVersions(a.version, b.version) * (filters.packageVersion.text !== null ? 1 : -1);
                    });
                    for (var i = 0; i < matchingVersion.length; ++i) {
                        if (matchingVersion[i].theme === filters.packageTheme) {
                            return matchingVersion[i];
                        }
                    }
                    if (filters.packageName !== null && filters.packageTheme !== 'default') {
                        var clone = Utils.extend({}, filters);
                        clone.packageTheme = 'default';
                        return this.findClosestPackage(clone);
                    }
                }
            }
            return null;
        };
        PackageFile.prototype.resolveImports = function (conf) {
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
                                var existing = null;
                                var incoherentClone = false;
                                var imported = importConf.packages[iname][j];
                                var importedPackageFileId = !imported.name.shared ? imported.packageFileId : this.id;
                                for (var k = 0; k < conf.packages[iname].length; ++k) {
                                    existing = conf.packages[iname][k];
                                    if (imported.theme === existing.theme && existing.packageFileId === importedPackageFileId &&
                                        this.compareVersions(imported.version, existing.version) === 0) {
                                        incoherentClone = !this.areSamePackages(existing, imported);
                                        break;
                                    }
                                }
                                if (!incoherentClone) {
                                    var clone = Utils.extend({}, imported);
                                    clone.packageFileId = importedPackageFileId;
                                    conf.packages[iname].push(clone);
                                }
                                else {
                                    Log.warning('Two packages named', "'" + Log.Colors.red(iname) + "'", '(version', "'" + Log.Colors.yellow(imported.version.text || 'any') + "'", 'theme', "'" + Log.Colors.yellow(imported.theme || 'none') + "')", "have been found with different content.\n", 'File 1', "'" + Log.Colors.cyan(this.getPackageFilePathById(existing.originalPackageFileId) || 'Unknown') + "'\n", 'File 2', "'" + Log.Colors.cyan(this.getPackageFilePathById(imported.originalPackageFileId) || 'Unknown') + "'\n", this.getContextString());
                                }
                            }
                        }
                        this.normalizePackagesThemes(conf.packages[iname]);
                    }
                }
            }
            this.contextOut();
        };
        PackageFile.prototype.getPackageFileConfigurationById = function (packageFileId) {
            for (var i = 0; i < loadedConfigurations.length; ++i) {
                if (loadedConfigurations[i].id === packageFileId) {
                    return loadedConfigurations[i];
                }
            }
            return null;
        };
        PackageFile.prototype.getPackageFilePathById = function (packageFileId) {
            var conf = this.getPackageFileConfigurationById(packageFileId);
            return conf !== null ? conf.path : null;
        };
        PackageFile.prototype.getPackageStringRepresentation = function (configuration) {
            if (configuration === null) {
                return '';
            }
            return configuration.name.name +
                (configuration.theme !== null ? (':' + configuration.theme) : '') +
                (configuration.version.text !== null ? ('#' + configuration.version.text) : '');
        };
        PackageFile.prototype.areSamePackages = function (a, b) {
            return false;
        };
        PackageFile.prototype.isValidKey = function (key) {
            return Utils.isString(key) && !!key.match(/^[a-z][\w.-]*$/i);
        };
        PackageFile.prototype.contextIn = function (input) {
            Array.prototype.push.apply(this.context, Utils.ensureArray(input));
        };
        PackageFile.prototype.contextOut = function (count) {
            if (count === void 0) { count = 1; }
            count = Math.max(1, count);
            this.context.splice(this.context.length - count, count);
        };
        PackageFile.prototype.getContextString = function () {
            var output = "In '";
            for (var i = 0; i < this.context.length; ++i) {
                output += (i > 0 ? '->' : '') + Log.Colors.magenta(this.context[i]);
            }
            return output + "'.";
        };
        return PackageFile;
    }());
    GP.PackageFile = PackageFile;
})(GP || (GP = {}));
var GP;
(function (GP) {
    var FileSystem = GP.Helpers.FileSystem;
    var Utils = GP.Helpers.Utils;
    var Log = GP.Helpers.Log;
    var globby = require('globby');
    var series = require('stream-series');
    var plumber = require('gulp-plumber');
    var maxId = 0;
    var GulpTask = (function () {
        function GulpTask(gulpfile, packageName, configuration, processorsManager) {
            this.gulpfile = gulpfile;
            this.packageName = packageName;
            this.configuration = configuration;
            this.processorsManager = processorsManager;
            this.name = '_gyp_' + packageName + '_' + this.getType() + '_' + (++maxId);
            this.outputPath = this.configuration.output[this.gulpfile.options.env].absolute;
        }
        GulpTask.prototype.getName = function () {
            return this.name;
        };
        GulpTask.prototype.execute = function () {
            return this.createStream(this.prepareInputs());
        };
        GulpTask.prototype.createStream = function (inputs) {
            var queue = [];
            var that = this;
            var addedFiles = [];
            var _loop_1 = function (i) {
                if (this_1.gulpfile.options.verbose) {
                    Log.info(Log.Colors.green('New stream'));
                }
                for (var j = 0; j < inputs[i].files.length; ++j) {
                    if (addedFiles.indexOf(inputs[i].files[j]) >= 0) {
                        inputs[i].files.splice(j--, 1);
                    }
                    else {
                        addedFiles.push(inputs[i].files[j]);
                        if (this_1.gulpfile.options.verbose) {
                            Log.info('File', "'" + Log.Colors.yellow(inputs[i].files[j]) + "'");
                        }
                    }
                }
                var processors = [];
                var stream = this_1.gulpfile.gulp.src(inputs[i].files).pipe(plumber(function (error) {
                    var messages = [];
                    if (Utils.isObject(error)) {
                        for (var key in error) {
                            if (error.hasOwnProperty(key) && Utils.isString(error[key]) && !error[key].match(/\r|\n/)) {
                                messages.push(" - " + key + " :");
                                messages.push("'" + Log.Colors.yellow(error[key]) + "'\n");
                            }
                        }
                    }
                    else {
                        messages.push(Utils.asString(error));
                    }
                    Log.error.apply(Log, ['An error occured when executing task', "'" + Log.Colors.red(that.name) + "'.\n"].concat(messages));
                    this.emit('end');
                }));
                if (inputs[i].processors !== null) {
                    for (var cname in inputs[i].processors.processors) {
                        if (inputs[i].processors.processors.hasOwnProperty(cname)) {
                            processors.push({
                                callback: cname,
                                options: inputs[i].processors.processors[cname]
                            });
                        }
                    }
                    processors.sort(function (a, b) {
                        return inputs[i].processors.executionOrder.indexOf(a.name) - inputs[i].processors.executionOrder.indexOf(b.name);
                    });
                    for (var j = 0; j < processors.length; ++j) {
                        if (this_1.gulpfile.options.verbose) {
                            Log.info('Processor', "'" + Log.Colors.yellow(processors[j].callback) + "'", 'options', "'" + Log.Colors.magenta(JSON.stringify(processors[j].options)) + "'");
                        }
                        stream = this_1.processorsManager.execute(processors[j].callback, processors[j].options, stream);
                        if (!Utils.isObject(stream)) {
                            Log.fatal('Invalid return value', "'" + Log.Colors.red(Utils.asString(stream)) + "'.", 'A processor must return a stream.');
                        }
                    }
                }
                else if (this_1.gulpfile.options.verbose) {
                    Log.info(Log.Colors.yellow('No processor'));
                }
                queue.push(stream);
            };
            var this_1 = this;
            for (var i = 0; i < inputs.length; ++i) {
                _loop_1(i);
            }
            if (!queue.length) {
                return null;
            }
            return series.apply(this, queue);
        };
        GulpTask.prototype.prepareInputs = function () {
            var inputs = [];
            var currentInput = { files: [], processors: null };
            for (var i = 0; i < this.configuration.input.length; ++i) {
                for (var j = 0; j < this.configuration.input[i].files.length; ++j) {
                    var path = this.configuration.input[i].files[j];
                    var files = path.isGlob ? globby.sync(path.absolute) : [path.absolute];
                    for (var k = 0; k < files.length; ++k) {
                        if (FileSystem.fileExists(files[k])) {
                            var resolvedConfiguration = this.processorsManager.resolve(files[k], path.packageId, this.configuration.input[i].processors);
                            if (this.processorsManager.equals(currentInput.processors, resolvedConfiguration)) {
                                currentInput.files.push(files[k]);
                            }
                            else {
                                if (currentInput.files.length) {
                                    inputs.push(currentInput);
                                }
                                currentInput = { files: [files[k]], processors: resolvedConfiguration };
                            }
                        }
                        else if (!path.isGlob || !FileSystem.isDirectory(files[k])) {
                            Log.warning('File', "'" + Log.Colors.red(files[k]) + "'", 'not found.');
                        }
                    }
                }
            }
            if (currentInput.files.length) {
                inputs.push(currentInput);
            }
            return inputs;
        };
        return GulpTask;
    }());
    GP.GulpTask = GulpTask;
})(GP || (GP = {}));
var GP;
(function (GP) {
    var FileSystem = GP.Helpers.FileSystem;
    var gulpif = require('gulp-if');
    var uglifyjs = require('gulp-uglify');
    var sourcemaps = require('gulp-sourcemaps');
    var relativeSourcesmaps = require('gulp-relative-sourcemaps-source');
    var concat = require('gulp-concat');
    var ScriptsTask = (function (_super) {
        __extends(ScriptsTask, _super);
        function ScriptsTask() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        ScriptsTask.prototype.getType = function () {
            return 'scripts';
        };
        ScriptsTask.prototype.createStream = function (inputs) {
            var env = this.gulpfile.options.env;
            var stream = _super.prototype.createStream.call(this, inputs);
            if (stream !== null) {
                return stream
                    .pipe(gulpif(env === 'dev', sourcemaps.init()))
                    .pipe(gulpif(env === 'prod', uglifyjs()))
                    .pipe(gulpif(env === 'dev', relativeSourcesmaps({ dest: 'tmp' })))
                    .pipe(concat(FileSystem.getRelativePath(FileSystem.getDirectoryName(this.outputPath), this.outputPath)))
                    .pipe(gulpif(env === 'dev', sourcemaps.write()))
                    .pipe(this.gulpfile.gulp.dest(FileSystem.getDirectoryName(this.outputPath)));
            }
            return null;
        };
        return ScriptsTask;
    }(GP.GulpTask));
    GP.ScriptsTask = ScriptsTask;
})(GP || (GP = {}));
var GP;
(function (GP) {
    var FileSystem = GP.Helpers.FileSystem;
    var gulpif = require('gulp-if');
    var uglifycss = require('gulp-uglifycss');
    var sourcemaps = require('gulp-sourcemaps');
    var relativeSourcesmaps = require('gulp-relative-sourcemaps-source');
    var concat = require('gulp-concat');
    var StylesTask = (function (_super) {
        __extends(StylesTask, _super);
        function StylesTask() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        StylesTask.prototype.getType = function () {
            return 'styles';
        };
        StylesTask.prototype.createStream = function (inputs) {
            var env = this.gulpfile.options.env;
            var stream = _super.prototype.createStream.call(this, inputs);
            if (stream !== null) {
                return stream
                    .pipe(gulpif(env === 'dev', sourcemaps.init()))
                    .pipe(gulpif(env === 'prod', uglifycss()))
                    .pipe(gulpif(env === 'dev', relativeSourcesmaps({ dest: 'tmp' })))
                    .pipe(concat(FileSystem.getRelativePath(FileSystem.getDirectoryName(this.outputPath), this.outputPath)))
                    .pipe(gulpif(env === 'dev', sourcemaps.write()))
                    .pipe(this.gulpfile.gulp.dest(FileSystem.getDirectoryName(this.outputPath)));
            }
            return null;
        };
        return StylesTask;
    }(GP.GulpTask));
    GP.StylesTask = StylesTask;
})(GP || (GP = {}));
var GP;
(function (GP) {
    var Utils = GP.Helpers.Utils;
    var FileSystem = GP.Helpers.FileSystem;
    var globby = require('globby');
    var merge = require('merge-stream');
    var MiscTask = (function (_super) {
        __extends(MiscTask, _super);
        function MiscTask() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        MiscTask.prototype.getType = function () {
            return 'misc';
        };
        MiscTask.prototype.createStream = function (inputs) {
            var stream = _super.prototype.createStream.call(this, inputs);
            if (stream !== null) {
                return stream.pipe(this.gulpfile.gulp.dest(this.outputPath));
            }
            return null;
        };
        MiscTask.prototype.execute = function () {
            var subTasks = [];
            var originalInputs = [];
            for (var i = 0; i < this.configuration.input.length; ++i) {
                for (var j = 0; j < this.configuration.input[i].files.length; ++j) {
                    var path = this.configuration.input[i].files[j];
                    if (path.isGlob && path.globBase) {
                        var indexed = {};
                        var files = globby.sync(path.absolute);
                        for (var k = 0; k < files.length; ++k) {
                            if (!FileSystem.isDirectory(files[k])) {
                                var relativeDir = FileSystem.getDirectoryName(files[k]).substring(path.globBase.length);
                                if (!Utils.isSet(indexed[relativeDir])) {
                                    var newInput = Utils.clone(this.configuration.input[i]);
                                    var newOutput = Utils.clone(this.configuration.output);
                                    newInput.files = [];
                                    newOutput.dev.absolute += relativeDir;
                                    newOutput.prod.absolute += relativeDir;
                                    indexed[relativeDir] = { watch: [], input: [newInput], output: newOutput };
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
                        for (var p in indexed) {
                            if (indexed.hasOwnProperty(p)) {
                                subTasks.push(new MiscTask(this.gulpfile, this.packageName, indexed[p], this.processorsManager));
                            }
                        }
                        originalInputs.push(Utils.clone(this.configuration.input[i]));
                        this.configuration.input[i].files.splice(j--, 1);
                    }
                }
            }
            var stream = _super.prototype.execute.call(this);
            this.configuration.input = originalInputs;
            for (var i = 0; i < subTasks.length; ++i) {
                var nextStream = subTasks[i].execute();
                if (nextStream !== null) {
                    stream = (stream !== null) ? merge(stream, nextStream) : nextStream;
                }
            }
            return stream;
        };
        return MiscTask;
    }(GP.GulpTask));
    GP.MiscTask = MiscTask;
})(GP || (GP = {}));
var GP;
(function (GP) {
    var Utils = GP.Helpers.Utils;
    var Log = GP.Helpers.Log;
    var gutil = require('gulp-util');
    var watch = require('gulp-watch');
    var crypto = require('crypto');
    var gulpfile = null;
    var GulpFile = (function () {
        function GulpFile(_gulp) {
            this._gulp = _gulp;
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
                Log.warning('Invalid environment', "'" + Log.Colors.red(this.options.env) + "'.", 'Must be', "'" + Log.Colors.yellow('dev') + "'", 'or', "'" + Log.Colors.yellow('prod') + "'.");
                this.options.env = 'dev';
            }
        }
        Object.defineProperty(GulpFile.prototype, "gulp", {
            get: function () {
                return this._gulp;
            },
            enumerable: true,
            configurable: true
        });
        GulpFile.prototype.createTasks = function (path, processors) {
            return this.createTasksForSeries(path, processors).concat(this.createTasksForParallel(path, processors));
        };
        GulpFile.prototype.createTasksForSeries = function (path, processors) {
            var tasksNames = [];
            var hash = this.generateTasksForPath(path, processors);
            for (var resourceType in this.tasks[hash].series) {
                if (this.tasks[hash].series.hasOwnProperty(resourceType)) {
                    for (var _i = 0, _a = this.tasks[hash].series[resourceType]; _i < _a.length; _i++) {
                        var task = _a[_i];
                        tasksNames.push(task.getName());
                    }
                }
            }
            return tasksNames;
        };
        GulpFile.prototype.createTasksForParallel = function (path, processors) {
            var tasksNames = [];
            var hash = this.generateTasksForPath(path, processors);
            for (var resourceType in this.tasks[hash].parallel) {
                if (this.tasks[hash].parallel.hasOwnProperty(resourceType)) {
                    tasksNames = tasksNames.concat(this.tasks[hash].parallel[resourceType]);
                }
            }
            return tasksNames;
        };
        GulpFile.prototype.generateTasksForPath = function (path, processors) {
            var hash = crypto.createHash('md5').update(path).digest("hex");
            if (!Utils.isUndefined(this.tasks[hash])) {
                return hash;
            }
            this.tasks[hash] = { series: {}, parallel: {} };
            for (var processingType in this.tasks[hash]) {
                if (this.tasks[hash].hasOwnProperty(processingType)) {
                    for (var i = 0; i < GulpFile.ResourcesTypes.length; ++i) {
                        this.tasks[hash][processingType][GulpFile.ResourcesTypes[i]] = [];
                    }
                }
            }
            var packageFile = new GP.PackageFile(path, this.options);
            var configuration = packageFile.getGulpfileConfiguration();
            if (configuration !== null) {
                for (var i = 0; i < configuration.packages.length; ++i) {
                    for (var pname in processors) {
                        if (processors.hasOwnProperty(pname)) {
                            configuration.processors.register(pname, processors[pname]);
                        }
                    }
                    for (var j = 0; j < GulpFile.ResourcesTypes.length; ++j) {
                        var rt = GulpFile.ResourcesTypes[j];
                        var conf = Utils.ensureArray(configuration.packages[i][rt]);
                        for (var k = 0; k < conf.length; ++k) {
                            var task = null;
                            switch (rt) {
                                case 'scripts':
                                    task = new GP.ScriptsTask(this, rt, conf[k], configuration.processors);
                                    break;
                                case 'styles':
                                    task = new GP.StylesTask(this, rt, conf[k], configuration.processors);
                                    break;
                                default:
                                    task = new GP.MiscTask(this, rt, conf[k], configuration.processors);
                                    break;
                            }
                            this.tasks[hash].series[rt].push(task);
                            this._gulp.task(task.getName(), (function (t) {
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
        };
        GulpFile.prototype.createWatchTasks = function (hash, packages) {
            var files = {};
            var filesWatchedCount = 0;
            var globWatchedCount = 0;
            var watchTasksCount = 0;
            for (var i = 0; i < packages.length; ++i) {
                for (var j = 0; j < GulpFile.ResourcesTypes.length; ++j) {
                    var rt = GulpFile.ResourcesTypes[j];
                    var conf = Utils.ensureArray(packages[i][rt]);
                    files[rt] = Utils.ensureArray(files[rt]);
                    for (var k = 0; k < conf.length; ++k) {
                        for (var l = 0; l < conf[k].watch.length; ++l) {
                            if (this.options.verbose) {
                                Log.info('Manually watching', "'" + Log.Colors.cyan(conf[k].watch[l].absolute) + "'");
                            }
                            files[rt].push(conf[k].watch[l].absolute);
                            globWatchedCount += conf[k].watch[l].isGlob ? 1 : 0;
                            filesWatchedCount += !conf[k].watch[l].isGlob ? 1 : 0;
                        }
                        for (var l = 0; l < conf[k].input.length; ++l) {
                            for (var m = 0; m < conf[k].input[l].files.length; ++m) {
                                var path = conf[k].input[l].files[m].absolute;
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
            var firstTaskName = null;
            for (var type in files) {
                if (files.hasOwnProperty(type) && files[type].length > 0) {
                    var name_3 = '_gyp_watch_' + type + "_" + hash;
                    firstTaskName = firstTaskName !== null ? firstTaskName : name_3;
                    this.tasks[hash].parallel[type].push(name_3);
                    this._gulp.task(name_3, (function (that, n, rt, files) {
                        return function () {
                            if (firstTaskName === n) {
                                Log.info(Log.Colors.yellow('Watching'), Log.Colors.magenta(filesWatchedCount), 'files and', Log.Colors.magenta(globWatchedCount), 'globs in total. Using', Log.Colors.magenta(watchTasksCount), 'tasks.');
                            }
                            watch(files, function (file) {
                                Log.info('Change on', "'" + Log.Colors.magenta(file.path) + "'");
                                for (var j = 0; j < that.tasks[hash].series[rt].length; ++j) {
                                    that.tasks[hash].series[rt][j].execute();
                                }
                            });
                        };
                    })(this, name_3, type, files[type]));
                    ++watchTasksCount;
                }
            }
        };
        GulpFile.ResourcesTypes = ['scripts', 'styles', 'misc'];
        return GulpFile;
    }());
    GP.GulpFile = GulpFile;
    function getGulpFileInstance(gulp) {
        if (gulpfile === null) {
            gulpfile = new GulpFile(gulp);
        }
        return gulpfile;
    }
    module.exports.load = function (path, gulp, processors) {
        if (processors === void 0) { processors = {}; }
        try {
            return getGulpFileInstance(gulp).createTasks(path, processors);
        }
        catch (e) {
            if (e instanceof GP.StopException) {
                return [];
            }
            throw e;
        }
    };
    module.exports.loadForGulp4 = function (path, gulp, processors) {
        if (processors === void 0) { processors = {}; }
        try {
            var gulpfile_1 = getGulpFileInstance(gulp);
            return {
                series: gulpfile_1.createTasksForSeries(path, processors),
                parallel: gulpfile_1.createTasksForParallel(path, processors)
            };
        }
        catch (e) {
            if (e instanceof GP.StopException) {
                return {
                    series: [],
                    parallel: []
                };
            }
            throw e;
        }
    };
})(GP || (GP = {}));
//# sourceMappingURL=index.js.map