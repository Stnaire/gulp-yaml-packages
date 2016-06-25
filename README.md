# Gulp yaml packages
Allows you to define complex dependency tree with ease for all your projects.
You define packages and how they should be merged in a YAML file then the module generates corresponding gulp tasks for you.

## Install

Install using node :
```
npm install gulp-yaml-packages
```

Add the module to your gulpfile.js : 
```javascript
var yamlPackages = require('gulp-yaml-packages');
```

If you want to run the example, download the whole repository and do: 
* `$ bower install` to install vendor dependencies.
* `$ gulp` to execute the gulpfile.

## Options

- **`--watch`** - To watch for changes on files declared on the .yml and rerun tasks automatically.
- **`--env`** - Set the environment (if prod, scripts and styles will be uglified, if dev sourcemaps will be generated).
- **`--theme`** - Theme name that can be used by packages with dynamic theme.
- **`--strict`** - Check that all 'standalone' packages define an output for each input.
- **`--verbose`** - To get more feedback on what is happening.


## How does it work?
Instead of manually writing tasks managing your resources, you define packages in a YAML configuration file.
The configuration file will be far more readable when your project uses a lot of resources with a complex dependency tree.

The YAML is then used to generate gulp tasks that you can execute in your gulpfile.
Here an example on how to use it:

```javascript
// gulpfile.js

var gulp = require('gulp');
var loader = require('gulp-yaml-packages');
var tasks = loader.load(__dirname+'/app/config/gulp_packages.yml', gulp);

gulp.task('default', tasks);
```

So first `gulp` is required, then `gulp-yaml-packages`.
The `load` method can take 3 arguments : 

- **`path`** - The **`absolute`** path to the YAML file to load. It's very important to give an **_absolute_** path here.
- **`gulp`** - The `gulp` instance created in your gulpfile.js.
- **`processors`** - (Optional) An object defining custom processors. You can define new processors or override internal ones. More info in the processors section.

The `load` method returns an array containing the name of tasks generated by the module.
This array is then passed as dependencies to the `default` gulp task so they are executed.

You can still create your own tasks if you so desire, like: 

```javascript
// gulpfile.js

var gulp = require('gulp');
var loader = require('gulp-yaml-packages');
var tasks = loader.load(__dirname+'/app/config/gulp_packages.yml', gulp);

gulp.task('myCustomTask', function() {
    // Do some other work.
});

gulp.task('default', ['myCustomTask'].concat(tasks));
```

## Structure of the YAML

The YAML is divided in 4 main parts : 

- **`packages`** - This is where you define your resources and what should be done with them.
- **`processors`** - Defines custom processing that should be done on resources. Each processor is simply a function that will be executed when the concerned resource is processed.
- **`parameters`** - Inspired by Symfony parameters, allows you to define reusable strings.
- **`imports`** - Allows you to import other YAML files into the current one.

## Packages

A basic package file is defined like this : 

```yaml
packages:
  # This is the package name
  app:
    # This is the type of resource
    styles:
      input: 'assets/less/my-private-file.less'
      output: 'public/css/this-one-is-public.css'
```

3 types of resources are recognized : 

- **`styles`** - For css, less, sass, etc.
- **`scripts`** - For js, ts, coffee, etc.
- **`misc`** - For everything that is not a script or a style (images, pdf, etc.).

The difference is that `styles` and `scripts` are merged in a single output and uglified in production.
Also, a sourcemap is generated in development so you can keep debuggable resources while testing.

`misc` files are only copied if you don't set any processor on them.

### Glob patterns

You can set glob patterns as input :
```yaml
packages:
  app:
    styles:
      input: 'assets/less/**/*.less'
      output: 'public/css/this-one-is-public.css'
```

In this case, every `.less` file in the `assets/less` folder will be compiled in `this-one-is-public.css`.

When dealing with `misc` resources (like `images`), the structure of your folders after the **first** "globstar" (`/**/`) will be preserved.
Consider the following example : 

```yaml
packages:
  app:
    misc:
      input: 'assets/images/**/*'
      output: 'public/images'
```

With a folder structure like this :

```
|-- assets
|   |-- images
|   |   |-- sub
|   |   |   |-- other.png
|   |   |-- cake.jpg
```

The output will be : 

```
|-- public
|   |-- images
|   |   |-- sub
|   |   |   |-- other.png
|   |   |-- cake.jpg
```

### Multiple input

You can set multiple input selectors for one output :
```yaml
packages:
  app:
    styles:
      input:
        - 'assets/less/**/*.less'
        - 'assets/sass/**/*.scss'
        - 'assets/css/specific.css'
      output: 'public/css/everything-in-here.css'
```

### Basic dependencies

Packages can depend on one another, use the `deps` key to define dependencies :

```yaml
packages:
  # jQuery
  jquery:
    # Here the 'input' is implicit. You can also give an array of paths.
    scripts: 'vendor/jquery/jquery.js'
  
  # Application
  app:
    # You can of course define an array of dependencies ([jquery, bootstrap, ...]).
    deps: jquery
    styles:
      ...
```

### Versions & themes

A package can define multiple versions. There are two criteria that define a version:

- **`version`** - The version number of the package (1.2, 3.2.3, etc.). Only support digits for now (3.1b will throw an error).
- **`theme`** - The package's theme name. Can be anything alphanumerical.

For example, to define two versions of jQuery:
```yaml
packages:
  jquery:
    -
      version: 1.12.4
      scripts: 'vendor/jquery-legacy/jquery.js'
    -
      version: 3.0.0
      scripts: 'vendor/jquery/jquery.js'
```

To define two different themes:

```yaml
packages:
  bootstrap:
    -
      theme: default
      styles: 'vendor/bootstrap/less/bootstrap.less'
    -
      theme: green
      deps: 'bootstrap:default'
      styles: 'assets/vendor/bootstrap/green-theme.less'
```

This will merge `bootstrap.less` and `green-theme.less` together in a single output.
Please note the `bootstrap:default` in `deps`. This is how you specify a theme in a dependency.

When importing a dependency, you can then ask for a minimum version:

```yaml
packages:
  app:
    deps: 'jquery#1.9'
```

This will look for a `jquery` package with a version `>= 1.9`. The closest one will be selected.

You can combine `theme` and `version` like this:

```yaml
packages:
  app:
    deps: 'bootstrap:green#3.3'
```

This will look for a `bootstrap` package with a `green` theme and a version `>= 3.3`.

### Advanced dependencies

You can also require a package from another YAML file:

```yaml
# app/config/gulp_packages.yml

packages:
  app:
    deps: 'app/config/vendor_packages.yml#jquery'
    styles:
      ...
```

```yaml
# app/config/vendor_packages.yml

packages:
  jquery:
    scripts: 'vendor/jquery/jquery.js'
```

Here the `jquey` package defined in `app/config/vendor_packages.yml` will be imported as dependency in the `app` package.

You can also use `theme` and `version` filters when importing a dependency:

```yaml
packages:
  app:
    deps: 'app/config/vendor_packages.yml#bootstrap:green#3.3.6'
    styles:
      ...
```

### Custom watches

By default, all files defined in your packages are automatically watched when the `--watch` option is set.
But, for example, `less` or `sass` files may `import` other files that are not defined in the yaml file, and so, not watched.

To solve this problem, you can add a `watch` key to your `styles` or `scripts` definitions: 

```yaml
packages:
  app:
    styles:
      watch: 'vendor/bootstrap/less/**/*.less'
      input: 'vendor/bootstrap/less/bootstrap.less'
```

Now a change on any `less` file in the `vendor/bootstrap/less` folder will trigger the watcher.
But only `bootstrap.less` will be compiled and copied.

## Parameters

Inspired by Symfony, parameters are a very basic replace by key thing.
You define them like this : 

```yaml
parameters:
  assets_dir: 'app/Resources/assets'
  vendor_dir: 'app/Resources/vendor'
  
packages:
  ...
```

And use them like this : 

```yaml
packages:
  app:
    styles:
      input: '%assets_dir%/styles/css/**/*.css'
      output: 'web/css/frontend.css'
```

The `%assets_dir%` will be replaced by `app/Resources/assets`.

You can also use parameters in parameters:

```yaml
parameters:
  root_dir: '../../'
  assets_dir: '%root_dir%/app/Resources/assets'
  vendor_dir: '%root_dir%/app/Resources/vendor'
```

They are two parameters that are always set internally:

- **`_theme`** - The value is given by the `--theme` option. If the option is not set, the default value is `default`.
- **`_env`** - The value is given by the `--env` option. If the option is not set, the default value is `dev`.

**Note:** You can't override these values.

These parameters are useful to dynamically change a package theme for example.

Consider the following example:

```yaml
packages:
  bootstrap:
    -
      # Default theme (only styles for example). If no 'theme' key is defined, the value 'default' is set.
      styles: 'vendor/bootstrap/less/bootstrap.less'
    -
      # 'default' theme is implicit.
      deps: bootstrap
      theme: red
      styles: 'assets/vendor/bootstrap/less/my-RED-theme.less'
    - 
      deps: bootstrap:default
      theme: green
      styles: 'assets/vendor/bootstrap/less/my-GREEN-theme.less'
  
  # And your application that uses that
  app:
    deps: bootstrap:red
    styles:
      output: 'web/css/output.css'
      
```

Here 2 themes are defined for bootstrap, a `red` one and a `green` one. The application then uses the `red` theme.
Not very exiting, but if you change the application dependency to : 

```yaml
  app:
    deps: bootstrap:%_theme%
    styles:
      output: 'web/css/output.css'
```

It becomes more interesting as the `_theme` parameter is set by the `--theme` option.

So you can run : 
* `$ gulp --theme=green` to switch to the green theme in no time.

## Processors

Processors are a set of callbacks you can use to make some custom processing on files.

Here the list of built-in processors:

- **`typescript`** - Compiles typescript files. Uses the `gulp-typescript` module (<a href="https://github.com/ivogabe/gulp-typescript" target="_blank">GitHub</a>).
- **`coffee`** - Compiles coffee script files. Uses the `gulp-coffee` module (<a href="https://github.com/contra/gulp-coffee" target="_blank">GitHub</a>).
- **`sass`** - Compiles sass files. Uses the `gulp-sass` module (<a href="https://github.com/dlmanning/gulp-sass" target="_blank">GitHub</a>).
- **`less`** - Compiles less files. Uses the `gulp-less` module (<a href="https://github.com/plus3network/gulp-less" target="_blank">GitHub</a>).
- **`cssurlajuster`** - Rewrite urls in css files. Uses the `gulp-css-url-adjuster` module (<a href="https://github.com/trentearl/gulp-css-url-adjuster" target="_blank">GitHub</a>).
- **`image`** - Optimize images. Uses the `gulp-image-optimization` module (<a href="https://github.com/firetix/gulp-image-optimization" target="_blank">GitHub</a>).

You can assign a processor to a package using the key `processors`: 

```yaml
packages: 
  app: 
    styles:
      output: 'public/css/public-file.css'
      input:
        files:
          - 'assets/less/first.less'
          - 'assets/less/second.less'
        processors: less
```

You can define custom options like this:

```yaml
packages: 
  app: 
    styles:
      output: 'public/css/public-file.css'
      input:
        files: 'assets/less/styles.less'
        processors: 
          less: 
            option1: val1
            option2: val2
```

Of course it's **very** annoying to type this for every package using a less file. So you can a global configuration using the global key `processors`:

```yaml
#
# Defines that the 'sass' processor must be run
# on every file having a 'sass' or 'scss' extension.
#
processors:
  -
    name: sass
    extensions: [sass, scss]
    options:
      option1: val1

#
# Then define packages like before
# Sass files will be automatically processed.
#
packages:
  app:
    styles:
      output: 'public/css/public-file.css'
      input:
        - 'assets/less/first.scss'
        - 'assets/less/second.scss'
```

Now both `scss` files will use the `sass` processor.

Notice that the `processors` key is **an array**. It's very important as the array defines the **order of execution**.

Then, each processor configuration can define the following attributes: 
- **`name`** - The name of your processor. That's the name you will refer to in your packages.
- **`callback`** - (Optional) The name of the function **callback** to call when executing the processor. If not defined, takes the value of `name`. 
- **`extensions`** - (Optional) If defined, the processor will be automatically assigned to every file matching one of the extensions.
- **`options`** - (Optional) Options object to send to the callback.

This configuration is already done internally for the built-in processors.
So any `.scss` or `.sass` file will be compiled using the `sass` processor, same goes for `less`, `typescript` and `coffee`.

### Custom processors

You can very easily add your own logic by creating a custom processor. In your `gulpfile.js`, simply add a third argument to the `load` method:

```javascript
// gulpfile.js

var gulp = require('gulp');
var loader = require('gulp-yaml-packages');
var tasks = loader.load(__dirname+'/app/config/gulp_packages.yml', gulp, {
    myCustomProcessor: function(stream, options) {
        // Do some custom processing here
        //
        // \!/ Be sure to return the stream or the pipeline will break.
        // If you modify the stream, by doing a pipe for example, return the new one.
        return stream;
    }
});

gulp.task('default', tasks);
```

Then you can use it in any of your YAML files:

```yaml
packages:
  app:
    scripts:
      input:
        files: 'assets/js/need-processing.js'
        processors: myCustomProcessor
```

You can also define you want to apply it on every `.js` file like this:

```yaml
processors:
  -
    name: myCustomProcessor
    extensions: js
    options: ~
```

**Note:** Currently, the processor will only be applied to files defined in the YAML file defining the processor configuration. May have some improvement to do here, ideas are welcome.

### Processors priority

To ensure processors are executed in a certain order, their configuration is defined as an array.
They are then executed in the order they were defined in the array.

Built-in processors are executed in the following order:
`typescript, coffee, sass, less, cssurlajuster, image`.

If you need to execute a custom processor before the `sass` processor for example, you can do:

```yaml
processors:
  -
    name: myCustomProcessor
    options: ~
  - sass
  
packages:
  ...
```

The `sass` processor here is only a string. This means you don't define a new configuration, but simply indicate the order of execution.
The new order of execution will be:
`typescript, coffee, myCustomProcessor, sass, less, cssurlajuster, image`.

Not defining the `sass` element will result in the following order:
`typescript, coffee, sass, less, cssurlajuster, image, myCustomProcessor`.

## Imports

You can import other YAML files to merge their packages with the current file:

```yaml
imports: '%vendor_dir%/vendor_packages.yml'

packages:
  app:
    # jQuery is defined in 'vendor_packages.yml'
    deps: jquery
    scripts: 'web/js/app.js'
```

You can import as many files as you want: 

```yaml
imports: 
  - app/config/file1.yml
  - other/file2.yml
  
packages:
  ...
```

If packages with the same are found, they will be added as new versions.
For example, writing :

```yaml
# app/config/vendors1.yml
  
packages:
  jquery:
    version: 1.12
    scripts: ...
```

```yaml
# app/config/vendors2.yml
  
packages:
  jquery:
    version: 3.0.0
    scripts: ...
```


```yaml
# app/config/gulp_packages.yml

imports: 
  - app/config/vendors1.yml
  - app/config/vendors2.yml

packages:
  ...
```

is the same as writing :
```yaml
# app/config/gulp_packages.yml

packages:
  jquery:
    - 
      version: 1.12
      scripts: ...
    -
      version: 3.0.0
      scripts: ...
```

**Note:** processors and parameters are NOT merged. They are **local to the YAML file defining them**.

## Advanced concepts

Here are explained some more "advanced" functionality that can be useful in certain cases but are not important enough to discuss in the main part of the documentation.

### Naming

Packages' names are global by default. Defining packages with the same name in multiple files is the same as defining a package with multiple versions in a single file.
You can isolate a package name to its YAML file by adding the prefix `@`:

```yaml
# src/bundles/bundle1/config/bundle1_packages.yml

packages:
  '@main':
    styles:
      ...
```

```yaml
# src/bundles/bundle2/config/bundle2_packages.yml

packages:
  '@main':
    styles:
      ...
```

Here we have 2 files defining a package named `main`. Without the `@` we would have two versions on the package available everywhere.
With the `@` we can only include these packages by directly referring to the YAML file:

```yaml
# app/config/gulp_packages.yml

packages:
  app:
    deps: 
      - 'src/bundles/bundle1/config/bundle1_packages.yml#main'
      - 'src/bundles/bundle2/config/bundle2_packages.yml#main'
    styles:
      ...
```

**Note:** when importing a YAML file using the `imports` key, packages prefixed with `@` are ignored.

### Standalone

Every package with input files and an output will create gulp tasks.
But there are some cases where you may want to define a package without using it.

Imagine you create a `vendor_packages.yml` that follows you between your projects.
In this file you would like to define packages for all the libraries you usually use: 


```yaml
# vendor_packages.yml

packages:
  jquery:
    scripts: 'vendor/jquery/jquery.js'
  bootstrap:
    styles: 'vendor/bootstrap/less/bootstrap.less'
    scripts: 'vendor/bootstrap/js/bootstrap.js'
    misc:
      input: 'vendor/bootstrap/fonts/**'
      output: 'web/fonts/bootstrap'
  angular:
    ...
  moment:
    ...
```

But in your current project, you don't use `bootstrap` and `jquery`, their files are not even present in your project.

For jquery it's all good, because you didn't define any `output` in the package. 
So until another package include its resources by doing `deps: jquery` the package will not do anything.

But `bootstrap` is different, it has `misc` resources that must define an `output`. 
When the YAML file will be loaded, a gulp task will be generated and the fonts will be copied, event if none of your packages depend on `bootstrap`. 

You can prevent this behavior by adding a `standalone` attribute to the package. It's value is `true` by default, which means the package is enough to generate output on its own.
If you set it to `false`, the package will only generate output when included in another package.

So :

```yaml
# vendor_packages.yml

packages:
  bootstrap:
    standalone: false
    styles: 'vendor/bootstrap/less/bootstrap.less'
    scripts: 'vendor/bootstrap/js/bootstrap.js'
    misc:
      input: 'vendor/bootstrap/fonts/**'
      output: 'web/fonts/bootstrap'
```

will only generate output if another package do `deps: bootstrap`.

### Advanced theming

To go further on the theming topic, I would like to share a technique I use to easily theme libraries.

When you want to override styles of a library you have basically two solutions : 

-  Make a new stylesheet that will be loaded `after` the library one. In this file you'll override the parts you want to change.
-  If your library is coded in `sass` or `less` ou can recompile it after changing some variables.

When the first one is a obvious, the second one can be trickier than it appear.
I've came up with the following solution (depending on the language) :

#### In SASS

With the following file in the role of the library :

```sass
// vendor/my-library/main.scss

$primary-color: #ff0000 !default;

.btn { background: $primary-color }
```

To modify the button color without rewriting the `.btn` class or modifying the original file, you can simply create a new file :

```sass
// app/my-library-theme.scss

// First, override the variable you want to change
$primary-color: #00ff00;

// Then import the original library file
@import "../vendor/my-library/main.scss
```

This will work because of the `!default` attribute on the `$primary-color` variable which indicates the variable must be set only if it doesn't exist yet.

#### In LESS

In LESS it's even more powerful as you can set variables **after** they have been used.

```less
// vendor/my-library/main.less

@primary-color: #ff0000;

.btn { background: @primary-color }
```

And the custom theme file :

```less
// app/my-library-theme.less

// You can import the library BEFORE overriding its variables
@import "../vendor/my-library/main.scss

// This is legal, the previous import will use this value
@primary-color: #00ff00;
```

#### The problem with packages

But by doing this, you're replacing a file of the library by one of your own (which then includes the library).

If you define your packages like I did in the <a href="#versions--themes">Versions & themes</a> section, you'll have a problem.

If you define your library like this :

```yaml
my-library:
  -
    theme: default
    styles: 'vendor/my-library/main.less'
  -
    deps: 'my-library:default'
    theme: green
    styles: 'app/my-library-theme.less'
```

When you include `my-library:green` in a package, the library will be compiled and concatenated **`two times`** because files of the `green` and `default` themes will be merged and because `my-library-theme.less` do an `@import`.

You could remove the `deps` key and copy/paste common parts of the two packages, but its ugly and remove a lot of value to the module.

The easiest way I've found is to create a `shared` theme to centralise what is common between themes : 

```yaml
my-library:
  -
    theme: shared
    scripts: ...
    misc: ...
  -
    deps: 'my-library:shared'
    theme: default
    styles: 'vendor/my-library/main.less'
  -
    deps: 'my-library:shared'
    theme: green
    styles: 'app/my-library-theme.less'
```

Like this you can do `deps: 'my-library:green` without having two copies of the styles.

### Explicit globs

As described in the <a href="#glob-patterns">Glob patterns</a> section, you can define a glob pattern as input of a package: 

```yaml
packages:
  app:
    scripts:
      input: 'assets/scripts/**/*.js'
      output: 'public/js/this-one-is-public.js'
```

But in certain cases, you may be tempted to use a very vague glob like this:

```yaml
packages:
  app:
    scripts:
      input: 'assets/scripts/**'
      output: 'public/js/this-one-is-public.js'
```

NEVER do this, because multiple problems can appear.

First, if other file than a script file is put in the `scripts` directory, the sourcemap generator or uglifier may crash.

But even if you are 100% certain only scripts file will ever be in that directory, you may experience crashes anyway.

For example, if you use `PHPStorm` or `WebStorm`, temporary files may be created when the IDE is compiling your files.
For instance, when compiling a `demo.ts` file, the IDE will create a `demo.ts___jb_tmp___` file (probably to ensure no data are lost if an error occurs while compiling).

This file will only last for a very short time, but it's enough to trigger the watch, to start the task and include it file in the pipeline when resolving the glob.
If you're unlucky, this file may be removed by the IDE before then end of the processing, and you'll get a fatal exception like : 

```
events.js:141
      throw er; // Unhandled 'error' event
      ^

Error: ENOENT: no such file or directory, stat '/app/Resources/assets/scripts/ts/demo.ts___jb_tmp___'
  at Error (native)
```

To prevent this, always filter your globs by extensions. `scripts/**/*.js`.
If you have multiple extensions, simply do: `scripts/**/*.{ts,js,coffee}`.

Hope it helps.

