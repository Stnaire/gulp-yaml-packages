/// <reference path="helpers/FileSystem.ts" />
/// <reference path="helpers/Utils.ts" />

namespace GP {
    import FileSystem = GP.Helpers.FileSystem;

    let gulpif = require('gulp-if');
    let uglifycss = require('gulp-uglifycss');
    let sourcemaps = require('gulp-sourcemaps');
    let relativeSourcesmaps = require('gulp-relative-sourcemaps-source');
    let concat = require('gulp-concat');

    export class StylesTask extends GulpTask { 
        /**
         * Gets the type of resources handled by the task.
         *
         * @returns string
         */
        protected getType(): string {
            return 'styles';
        }

        /**
         * See: GulpTask::createStream().
         *
         * @param {GulpfileInputConfiguration[]} inputs
         *
         * @returns {object}
         */
        protected createStream(inputs: GulpfileInputConfiguration[]): any {
            const env = this.gulpfile.options.env;
            const stream: any = super.createStream(inputs);
            if (stream !== null) {
                return stream
                    .pipe(gulpif(env === 'dev', sourcemaps.init()))
                    .pipe(gulpif(env === 'prod', uglifycss()))
                    .pipe(gulpif(env === 'dev', relativeSourcesmaps({dest: 'tmp'})))
                    .pipe(concat(FileSystem.getRelativePath(FileSystem.getDirectoryName(this.outputPath), this.outputPath)))
                    .pipe(gulpif(env === 'dev', sourcemaps.write()))
                    .pipe(this.gulpfile.gulp.dest(FileSystem.getDirectoryName(this.outputPath)));
            }
            return null;
        }
    }
}

