'use strict'

const { GLib, Gio } = imports.gi;
const ByteArray = imports.byteArray;
const ExtensionUtils = imports.misc.extensionUtils;

/**
 * 
 * @param {string} value
 * @returns {boolean}
 */
function setServiceMode(value) {
    const confFile = Gio.File.parse_name('~/.imwheelrc');
    const imWheelProgramWheel = 'imwheel --kill -b "4 5"';
    const imWheelQuit = 'imwheel --kill --quit';

    const text = `".*"\nNone,      Up,   Button4, ${value}\nNone,      Down, Button5, ${value}\nControl_L, Up,   Control_L|Button4\nControl_L, Down, Control_L|Button5\nShift_L,   Up,   Shift_L|Button4\nShift_L,   Down, Shift_L|Button5`;
    const [success, tag] = confFile.replace_contents(text, null, false,  Gio.FileCreateFlags.REPLACE_DESTINATION, null);

    if (success) {
        const imWheelCommand = value != '0' ? imWheelProgramWheel : imWheelQuit;
        GLib.spawn_command_line_async(imWheelCommand);
    }

    return success;
}

function exec(command) {
    const output = GLib.spawn_command_line_sync(command);
    return {
        ok: output[0],
        standard_output: ByteArray.toString(output[1]),
        standard_error: ByteArray.toString(output[2]),
        exit_status: output[3]
    }
}

function checkInstalled() {
    const checkExists = exec('which imwheel');
    return checkExists.standard_output.length > 0;
}