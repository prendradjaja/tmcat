/// <reference path="typings/node.d.ts" />
/// <reference path="typings/underscore.d.ts" />
/// <reference path="typings/underscore.string.d.ts" />
/// <reference path="typings/minimist.d.ts" />
/// <reference path="typings/shelljs.d.ts" />

import fs = require('fs');
import _ = require('underscore');
import _s = require('underscore.string');
import minimist = require('minimist');
import shelljs = require('shelljs');

// Various information about a module. This is needed for translation.
interface Module {
    name: string;
    filepaths: string[];
    last_indices: number[];
        // last_indices holds the line number of the last line in each file of
        // the module, plus a zero at the beginning. For example, if your
        // module looks like:
        //
        //     SomeModule/bar.ts:
        //         export bar = '|';
        //
        //     SomeModule/foo.ts:
        //         export foo = 'foo';
        //         export foo2 = 'foo2';
        //
        // Then, once concatenated, SomeModule.ts will be:
        //     export bar = '|';
        //     export foo = 'foo';
        //     export foo2 = 'foo2';
        //
        // Line 1 is the end of bar.ts, and line 3 is the end of foo.ts. So,
        // with the added zero at the beginning, last_indices will be [0, 1,
        // 3].
}

export function main(): void {
    var __ = parse_args();
    var module_names = __[0];
    var compile_cmd = __[1];

    var modules:Module[] = [];

    _.each(module_names, module_name => {
        var filepaths = get_filepaths(module_name);
        var file_contents = _.map(filepaths, read_file);

        var plus = (a, b) => a + b;
        var concatenated_code = _.reduce(file_contents, plus);

        fs.writeFileSync(module_name + '.ts', concatenated_code);

        var last_indices = _.chain(file_contents)
                .map(x => x.split('\n').length - 1)
                .reduce((memo, num) => memo.concat(memo.slice(-1)[0] + num), [0])
                .value();

        modules.push({
            name: module_name,
            filepaths: filepaths,
            last_indices: last_indices
        });
    });

    translate_output(compile_cmd, tsc_message =>
        translate_message(tsc_message, modules));
}

// Run a shell command, passing each line of stdout through f() before
// printing.
function translate_output(cmd:string, f:(s:string)=>string): void {
    var output: string = shelljs.exec(cmd, {silent:true}).output;
    var lines = output.split('\n').slice(0, -1);
    _.each(lines, x => console.log(f(x)));
}

// Translate the given string, (which should be one line of tsc output) e.g.
// from
//    Foo.ts(5,1): error ...
// to
//    Foo/bar.ts(2,1): error ...
function translate_message(tsc_message:string, modules:Module[]): string {
    // Each line of tsc's output is one error message, of this form:
    // filename.ts(line_num, col_num): description
    for (var i in modules) {
        var module = modules[i];

        var module_name = module.name;
        var filepaths = module.filepaths;
        var last_indices = module.last_indices;

        var message_prefix = module_name + '.ts(';
        if (_s.startsWith(tsc_message, message_prefix)) {
            // Parse into line number and everything else.
            var after_filename = tsc_message.slice(message_prefix.length);
            var pattern = /^(\d+)(,.*)$/;
            var match = after_filename.match(pattern);
            if (match === null) {
                return tsc_message;
            }
            var module_line_num = +match[1];
            var message_suffix = match[2];

            // Translate.
            var __ = translate_line_number(module_line_num, module);
            var filepath = __[0];
            var line_num = __[1];
            if (line_num === 0) {
                return tsc_message;
            }

            // Reassemble message.
            return filepath + '(' + line_num + message_suffix;
        }
    }
    return tsc_message;
}

// Translate a line number in the concatenated module file into the
// corresponding filepath and line number before concatenation.
function translate_line_number(n:number, module:Module): [string, number] {
    var filepaths = module.filepaths;
    var last_indices = module.last_indices;
    if (n < 1 || n > last_indices.slice(-1)[0]) {
        return ['', 0];
    }
    for (var i = 0; i < last_indices.length; i++) {
        if (last_indices[i] >= n) break;
    }
    return [filepaths[i - 1], n - last_indices[i - 1]];
}


function parse_args(): [string[], string] {
    var args = minimist(process.argv.slice(2));
    if (valid_args(args)) {
        var module_names = args._;
        var compile_cmd = <string> args['c'];
        _.each(module_names, check_directory_exists);
        return [module_names, compile_cmd];
    } else {
        console.error('tmcat: bad args'); // TODO elaborate, document
        process.exit(1);
    }
}

function valid_args(args) {
    return 'c' in args && typeof(args['c']) === 'string';
}

function get_filepaths(module_name:string): string[] {
    var filenames = fs.readdirSync(module_name);
    return _.map(filenames,
                 name => module_name + '/' + name);
}

function read_file(path): string {
    // TODO: check that this is a file (and not, e.g., a directory)?
    return fs.readFileSync(path, 'utf8');
}

function check_directory_exists(path:string): void {
    if (!directory_exists(path)) {
        console.error('tmcat: Directory ' + path + ' does not exist.');
        process.exit(1);
    }
}

function directory_exists(path:string): boolean {
    try {
        return fs.lstatSync(path).isDirectory();
    } catch (e) {
        if (e.code !== 'ENOENT') {
            throw e;
        }
        return false;
    }
}
