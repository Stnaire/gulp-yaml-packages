
namespace GP {
    import Utils = GP.Helpers.Utils;
    import FileSystem = GP.Helpers.FileSystem;

    var gulpif = require('gulp-if');
    var uglifyjs = require('gulp-uglify');
    var sourcemaps = require('gulp-sourcemaps');
    var relativeSourcesmaps = require('gulp-relative-sourcemaps-source');
    var concat = require('gulp-concat');

    export class ScriptsTask extends GulpTask {
        /**
         * Gets the type of resources handled by the task.
         *
         * @returns string
         */
        protected getType(): string {
            return 'scripts';
        }

        /**
         * See: GulpTask::createStream().
         *
         * @param GulpfileInputConfiguration[] inputs
         * @returns object
         */
        protected createStream(inputs: GulpfileInputConfiguration[]): any {
            var env = this.gulpfile.options.env;
            return super.createStream(inputs)
                .pipe(gulpif(env === 'dev', sourcemaps.init()))
                .pipe(gulpif(env === 'prod', uglifyjs()))
                .pipe(gulpif(env === 'dev', relativeSourcesmaps({dest: 'tmp'})))
                .pipe(concat(this.outputPath))
                .pipe(gulpif(env === 'dev', sourcemaps.write()))
                .pipe(this.gulpfile.gulp.dest(FileSystem.getDirectoryName(this.outputPath)));
        }
    }
}

