
namespace GP.Helpers {
    let gutil = require('gulp-util');

    export class Log {
        static Colors = gutil.colors;

        /**
         * Display an info to the user.
         *
         * @param {string[]} messages
         */
        static info(...messages: string[]): void {
            gutil.log.apply(null, messages);
        }

        /**
         * Display a warning to the user.
         *
         * @param {string[]} messages
         */
        static warning(...messages: string[]): void {
            messages.unshift(gutil.colors.bgYellow.black('! WARNING !'));
            gutil.log.apply(null, messages);
        }

        /**
         * Display an error to the user.
         *
         * @param {string[]} messages
         */
        static error(...messages: string[]): void {
            messages.unshift(gutil.colors.bgRed.black('! ERROR !'));
            gutil.log.apply(null, messages);
        }

        /**
         * Show a fatal error to the user and stops the execution.
         *
         * @param {string[]} messages
         */
        static fatal(...messages: string[]): void {
            messages.unshift(gutil.colors.bgYellow.black('! gulp-packages stops !'));
            messages.unshift(gutil.colors.bgRed.black('!! FATAL ERROR !!'));
            gutil.log.apply(null, messages);
            throw new StopException();
        }
    }
}
