/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */
'use strict'

const GETTEXT_DOMAIN = 'my-indicator-extension';
const ByteArray = imports.byteArray;

const { GObject, St, GLib, Gio } = imports.gi;

const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const utils = Me.imports.utils;


class SyncShellCommand {
    constructor(command) {
        this.command = command;
    }

    execute() {
        const output = GLib.spawn_command_line_sync(this.command);
        return {
            ok: output[0],
            standard_output: ByteArray.toString(output[1]),
            standard_error: ByteArray.toString(output[2]),
            exit_status: output[3]
        }
    }
}

class AsyncShellCommand {
    constructor(command) {
        this.command = command;
    }

    execute() {
        GLib.spawn_command_line_async(this.command);
    }
}


class IMWheelConfiguration {
    constructor() {
        this.file = Gio.File.parse_name('~/.imwheelrc');
    }
    
    update(buttonValue) {
        const text = `".*"\nNone,      Up,   Button4, ${buttonValue}\nNone,      Down, Button5, ${buttonValue}\nControl_L, Up,   Control_L|Button4\nControl_L, Down, Control_L|Button5\nShift_L,   Up,   Shift_L|Button4\nShift_L,   Down, Shift_L|Button5`;
        const [success, tag] = this.file.replace_contents(text, null, false,  Gio.FileCreateFlags.REPLACE_DESTINATION, null);
    }
}


class RebindButtonsCommand {
    execute() {
        new AsyncShellCommand('imwheel -kill -b "45"').execute();
    }
}


class QuitCommand {
    execute() {
        new AsyncShellCommand('imwheel -kill -quit').execute();
    }
}


class IMWheel {
    constructor() {
        this.configuration = new IMWheelConfiguration();
    }

    isInstalled() {
        const checkExists = new SyncShellCommand('which imwheel').execute();
        return checkExists.standard_output.length > 0;
    }

    rebind(buttonValue) {
        this.configuration.update(buttonValue);
        new RebindButtonsCommand().execute();
    }

    quit() {
        new QuitCommand().execute();
    }
}


/**
 * 
 * @param {string} buttonValue
 * @returns {boolean}
 */
function setServiceMode(buttonValue) {
    const imWheel = new IMWheel();
    if (buttonValue !== 0) {
        imWheel.rebind(buttonValue);
    } else {
        imWheel.quit();
    }
    return true;
}


const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init(settings) {
            super._init(0.0, _('Toggle imwheel settings'));

            const imWheel = new IMWheel();

            this.imwInstalled = imWheel.isInstalled();

            this.currentMode = () => {
                return settings.get_string('current-mode');
            };

            this.getIconName = () => {
                if (!this.imwInstalled) {
                    return 'dialog-error-symbolic';
                }

                return this.currentMode() === 'touchpad' ? 'input-touchpad-symbolic' : 'input-mouse-symbolic'
            };

            this.icon = new St.Icon({
                icon_name: this.getIconName(),
                style_class: 'system-status-icon',
            });

            this.add_child(this.icon);

            this.applyCurrentMode = () => {
                const modeSuccess = setServiceMode(settings.get_int(`${this.currentMode()}-value`));
                const iconName = modeSuccess ? this.getIconName() : 'dialog-warning-symbolic';
                this.icon.set_icon_name(iconName);
            }

            this.toggleModes = () => {
                settings.set_string('current-mode', (this.currentMode() === 'touchpad' ? 'mouse' : 'touchpad'));
                this.applyCurrentMode();
            };

            if (this.imwInstalled) {
                this.connect('button-press-event', this.toggleModes);
            }
        }
    }
);

class Extension {
    constructor(uuid) {
        this._uuid = uuid;

        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this.settings = ExtensionUtils.getSettings('org.gnome.shell.toggleimwheel_mijorus');

        this._indicator = new Indicator(this.settings);
        Main.panel.addToStatusArea(this._uuid, this._indicator);
        this._indicator.applyCurrentMode();
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
        this.settings = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
