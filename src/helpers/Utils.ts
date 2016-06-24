

namespace GP.Helpers {
    var extend = require('extend');
    var isGlob = require('is-glob');

    export class Utils {
        /**
         * Test if the input is an object.
         *
         * @param mixed input
         * @returns boolean
         */
        static isObject(input: any): boolean {
            return input !== null && typeof(input) === 'object';
        }

        /**
         * Test if the input is an array.
         *
         * @param mixed input
         * @returns boolean
         */
        static isArray(input: any): boolean {
            return Array.isArray(input);
        }

        /**
         * Test if the input is undefined.
         *
         * @param mixed input
         * @returns boolean
         */
        static isUndefined(input: any): boolean {
            return typeof(input) === 'undefined';
        }

        /**
         * Test if the input is a string and optionally if its not empty.
         *
         * @param mixed   input
         * @param boolean notEmpty (optional, default: false)
         * @returns boolean
         */
        static isString(input: any, notEmpty: boolean = false): boolean {
            return typeof(input) === 'string' && (!notEmpty || !!Utils.trim(input).length);
        }

        /**
         * Test if the input is defined and not null.
         *
         * @param mixed input
         * @returns boolean
         */
        static isSet(input: any): boolean {
            return input !== null && !Utils.isUndefined(input);
        }

        /**
         * Test if the input is a glob string.
         *
         * @param mixed input
         * @returns boolean
         */
        static isGlob(input: any): boolean {
            if (Utils.isString(input)) {
                return isGlob(input);
            }
            return false;
        }

        /**
         * Test if the input looks like a valid path.
         * Do not test path existence.
         *
         * @param mixed input
         * @returns boolean
         */
        static isValidPath(input: any): boolean {
            var reg = /[‘“!#$%&+^<=>`]/;
            return Utils.isString(input) && reg.test(input) && !Utils.isGlob(input);
        }

        /**
         * Test if one or all values in candidates are defined in data.
         *
         * @param object       data
         * @param string|Array candidates
         * @param boolean      strict     if true, all candidates must be defined
         *                                (optional, default: true)
         * @returns boolean
         */
        static isDefined(data: any, candidates: any, strict: boolean = true): boolean {
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
                } else if (strict === true) {
                    return false;
                }
            }
            return false;
        }

        /**
         * Returns a string representation of the input.
         *
         * @param mixed input
         * @returns string
         */
        static asString(input: any): string {
            if (input === void 0) {
                return '[undefined]';
            }
            if (input === null) {
                return '[null]';
            }
            if (Utils.isArray(input)) {
                return '[object Array]';
            }
            return (typeof(input['toString']) === 'function') ? input.toString() : typeof(input);
        }

        /**
         * Ensure the input data are returned as a valid array.
         *
         * @param mixed input
         * @returns Array
         */
        static ensureArray(input: any): Array<any> {
            if (Utils.isArray(input)) {
                return input;
            }
            if (input === null || Utils.isUndefined(input)) {
                return [];
            }
            return [input];
        }

        /**
         * Removes spaces and tabs from the start and end of a string.
         *
         * @param string str
         * @returns string
         */
        static trim(str: string): string {
            return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        }

        /**
         * Pad a string with trailing '0' or a custom char.
         *
         * @param string str
         * @param number nb
         * @param string c   (optional, default: '0')
         * @returns string
         */
        static pad(str: string, nb: number, c: string = '0'): string {
            str = str + '';
            return str.length >= nb ? str : (str + new Array(nb - str.length + 1).join(c));
        }

        /**
         * Makes a deep copy of an object.
         *
         * @param mixed input
         * @returns object or the input if its not an object
         */
        static deepCopy(input: any): any {
            if (Utils.isObject(input)) {
                return Utils.extend(true, {}, input);
            }
            return input;
        }

        /**
         * Extends obj1 with obj2.
         *
         * @param object obj1
         * @param object obj2
         * @returns object
         */
        static extend(...objects: Object[]): Object {
            return extend.apply(null, objects);
        }

        /**
         * Clone a variable.
         *
         * @param mixed input
         * @returns mixed
         */
        static clone(input: any): any {
            if (Utils.isArray(input)) {
                return input.slice();
            }
            if (Utils.isObject(input)) {
                return Utils.deepCopy(input);
            }
            return input;
        }

        /**
         * Test if a equals b by comparing their content.
         * Make a deep comparison of objects.
         *
         * @param mixed a
         * @param mixed b
         * @returns boolean
         */
        static equals(a: any, b: any): boolean {
            return JSON.stringify(Utils.generateHashData(a)) === JSON.stringify(Utils.generateHashData(b));
        }

        /**
         * Normalize input data so it can easily be compared (after being "jsonified" of example).
         *
         * @param mixed data
         * @returns mixed
         */
        static generateHashData(data: any): any {
            if (Utils.isArray(data)) {
                var output: any = [];
                for (var i = 0; i < data.length; ++i) {
                    output.push(Utils.generateHashData(data[i]));
                }
                return output;
            } else if (Utils.isObject(data)) {
                var output: any = [];
                var keys = Object.keys(data);
                keys.sort();
                for (var i = 0; i < keys.length; ++i) {
                    var k = keys[i];
                    var obj: any = {};
                    obj[k] = Utils.generateHashData(data[k]);
                    output.push(obj);
                }
                return output;
            }
            if (Utils.isString(data)) {
                return Utils.slugify(data);
            }
            return data;
        }

        /**
         * Basic slugify.
         * Source: https://gist.github.com/mathewbyrne/1280286
         *
         * @param string text
         * @returns string
         */
        static slugify(text: string): string {
            return text.toString().toLowerCase()
                .replace(/\s+/g, '-')           // Replace spaces with -
                .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
                .replace(/\-\-+/g, '-')         // Replace multiple - with single -
                .replace(/^-+/, '')             // Trim - from start of text
                .replace(/-+$/, '');            // Trim - from end of text
        }
    }
}
