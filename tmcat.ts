/// <reference path="/home/pandu/c/dtyped/node/node.d.ts" />
/// <reference path="/home/pandu/c/dtyped/underscore/underscore.d.ts" />
/// <reference path="/home/pandu/c/dtyped/underscore.string/underscore.string.d.ts" />

import fs = require('fs');
import _ = require('underscore');
import _s = require('underscore.string');

export function main(): void {
    var __ = parse_args();
    var module_name = __[0];
    var compile_cmd = __[1];

    var filepaths = get_filepaths(module_name);
    var file_contents = _.map(filepaths, read_file);

    var plus = (a, b) => a + b;
    var concatenated_code = _.reduce(file_contents, plus);

    fs.writeFileSync(module_name + '.ts', concatenated_code);

    var last_indices = _.chain(file_contents)
            .map(x => x.split('\n').length - 1)
            .reduce((memo, num) => memo.concat(memo.slice(-1)[0] + num), [0])
            .value();

    translate_output(compile_cmd, tsc_message => {
        var message = translate_message(tsc_message, module_name, last_indices, filepaths);
        console.log(message);
    });
}

// Run each line of output from shell command 'cmd' through the function f.
function translate_output(cmd:string, f:Function): void {
    var spawn = require('child_process').spawn,
        child = spawn('bash', ['-c', 'eval ' + cmd]);

    // Adapted from https://github.com/joyent/node/issues/7412
    var chunks = [];

    child.stdout.on('data', chunk => chunks.push(chunk));

    child.on('close', () => {
        var lines = chunks.join('').split('\n').slice(0, -1);
        _.each(lines, x => f(x));
    });
}

function translate_message(tsc_message:string, module_name:string, last_indices:number[], filepaths:string[]): string {
    // Each line of tsc's output is one error message, of this form:
    // filename.ts(line_num, col_num): description
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
        var __ = translate_line_number(module_line_num, last_indices, filepaths);
        var filepath = __[0];
        var line_num = __[1];
        if (line_num === 0) {
            return tsc_message;
        }

        // Reassemble message.
        return filepath + '(' + line_num + message_suffix;
    } else {
        return tsc_message;
    }
}

// "Translate" a line number in the concatenated module file into the
// corresponding filepath and line number before concatenation.
function translate_line_number(n:number, last_indices:number[], filepaths:string[]): [string, number] {
    if (n < 1 || n > last_indices.slice(-1)[0]) {
        return ['', 0];
    }
    for (var i = 0; i < last_indices.length; i++) {
        if (last_indices[i] >= n) break;
    }
    return [filepaths[i - 1], n - last_indices[i - 1]];
}


function parse_args(): [string, string] {
    if (process.argv.length === 5) {
        var dir_name = process.argv[2];
        var compile_cmd = process.argv[4];
        check_directory_exists(dir_name);
        return [dir_name, compile_cmd];
    } else {
        console.error('tmcat: bad args'); // TODO elaborate, document
        process.exit(1);
    }
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
