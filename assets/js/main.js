(function(window, document, undefined) {
    "use strict";

    function Response(data) {
        if (!(this instanceof Response)) {
            return new Response(data);
        }

        this.data = data;
    }

    Response.prototype = (function() {

        function isOk() {
            return getStatus.call(this) === "OK";
        }

        function isError() {
            return getStatus.call(this) === "ERR";
        }

        function getStatus() {
            return this.data.status || null;
        }

        function getCode() {
            return this.data.code || 0;
        }

        function getText() {
            return this.data.text || "";
        }

        return {
            isOk: isOk,
            isError: isError,
            getCode: getCode,
            getStatus: getStatus,
            getText: getText
        };
    })();

	let OS;
    let PATH;
    let CMD;
    let NUM = -1;
    let LIST = [];
	let COMMANDS;
    const CACHE = [];
	const BSD_COMMANDS = [];
	const DARWIN_COMMANDS = [];
	const LINUX_COMMANDS = [
		'cal',
		'cat',
		'cd',
		'chgrp',
		'chmod',
		'chown',
		'cp',
		'crontab',
		'df',
		'dir',
		'du',
		'echo',
		'file',
		'find',
		'free',
		'grep',
		'groups',
		'head',
		'hostname',
		'id',
		'less',
		'locate',
		'ls',
		'man',
		'mkdir',
		'more',
		'mv',
		'printenv',
		'printf',
		'ps',
		'pwd',
		'rm',
		'rmdir',
		'sudo',
		'sum',
		'tail',
		'times',
		'touch',
		'type',
		'uname',
		'uptime',
		'w',
		'wc',
		'whereis',
		'whoami',
	];
	const SOLARIS_COMMANDS = [];
    const WIN_COMMANDS = [
        'cat',
        'cd',
        'chdir',
        'cipher',
        'cls',
        'cmd',
        'date',
        'del',
        'dispdiag',
        'echo',
        'erase',
        'exit',
        'find',
        'findstr',
        'getmac',
        'ipconfig',
        'hostname',
        'klist',
        'ls',
        'md',
        'mkdir',
        'more',
        'nslookup',
        'path',
        'rd',
        'ren',
        'rename',
        'rmdir',
        'time',
        'type',
        'ver',
        'vol',
        'whoami'
    ];

	function is_bsd() {
        return OS === 'BSD';
    }

    function is_darwin() {
        return OS === 'Darwin';
    }

    function is_linux() {
        return OS === 'Linux';
    }

    function is_solaris() {
        return OS === 'Solaris';
    }

    function is_unknown() {
        return OS === 'Unknown';
    }

    function is_win() {
        return OS === 'Windows';
    }

	function apply_data(data) {
		PATH = data.result;
		LIST = data.list;
		OS = data.os;
		path.textContent = PATH;
		COMMANDS = get_commands();
	}

	function get_commands() {
		let commands;

		switch (true) {
		case is_bsd():
			commands = BSD_COMMANDS;
			break;
		case is_darwin():
			commands = DARWIN_COMMANDS;
			break;
		case is_linux():
			commands = LINUX_COMMANDS;
			break;
		case is_solaris():
			commands = SOLARIS_COMMANDS;
			break;
		case is_win():
			commands = WIN_COMMANDS;
			break;
		case is_unknown():
		default:
			commands = [];
			break;
		}

		return commands;
	}

    function get_path() {
        const path = document.querySelector("#path");
        if (!path) {
            return;
        }

        fetch("ajax.php?do=get_path", {
            headers: {
                "Accept": "application/json; charset=utf-8"
            }
        }).then(function(response) {
            return response.ok ? response.json() : Promise.reject(response);
        }).then(function(data) {
            const response = new Response(data);
            if (response.isOk()) {
				apply_data(data);
            }
        }).catch(function (reason) {
            console.warn(reason);
        });
    }

    function set_path(value) {
        const path = document.querySelector("#path");
        if (!path) {
            return;
        }

        const fd = new FormData();
        fd.append("path", value);

        fetch("ajax.php?do=set_path", {
            method: "POST",
            headers: {
                "Accept": "application/json; charset=utf-8",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams(fd).toString()
        }).then(function(response) {
            return response.ok ? response.json() : Promise.reject(response);
        }).then(function(data) {
            let val;
            if (/^[a-z]:$/i.test(value)) {
                val = [PATH, ">", value].join("");
            } else {
                val = [PATH, ">cd ", value].join("");
            }

            add_result(val, true);
            const response = new Response(data);
            if (response.isOk()) {
                apply_data(data);
            } else {
                add_result(response.getText());
            }
            to_bottom();
        }).catch(function (reason) {
            console.warn(reason);
        });
    }

    function cmd_focus() {
        if (!CMD) {
            return;
        }

        CMD.focus();
    }

    function cmd_empty() {
        if (!CMD) {
            return;
        }

        CMD.value = "";
    }

    function to_bottom() {
        window.scrollTo(0, document.body.scrollHeight);
    }

    function on_enter(event) {
        event.preventDefault();

        NUM = -1;
        CACHE.push(this.value);
        let value = this.value.toString().trim();

        if (value === "" || /^cd\s*(\.\/?)?$/i.test(value)) {
            add_result( PATH + ">" + value, true);
            to_bottom();
        } else if (/^(?:cls|clear)$/i.test(value)) {
            clear_result();
        } else if (/^cd\s*/i.test(value)) {
            set_path(value.replace(/^cd\s*/i, ""));
        } else if (/^[a-z]:$/i.test(value)) {
            set_path(value);
        } else if (/^exit(\s+\d+)?$/i.test(value)) {
            window.close();
        } else {
            send_cmd(value);
        }
        cmd_empty();
        cmd_focus();
    }

    function on_escape(event) {
        event.preventDefault();
        cmd_empty();
    }

    function on_arrow_down(event) {
        event.preventDefault();
        if (!CACHE.length) {
            return;
        }

        if (NUM - 1 < 0) {
            return;
        }
        NUM -= 1;

        cmd_cache();
    }

    function on_arrow_up(event) {
        event.preventDefault();
        const size = CACHE.length;
        if (!size) {
            cmd_empty();
            return;
        }

        if (NUM + 1 >= size) {
            return;
        }
        NUM += 1;

        cmd_cache();
    }

    function on_tab(event) {
        event.preventDefault();
        const value = this.value;
        if (value.indexOf(" ") === -1) {
            for (let cmd of COMMANDS) {
                if (cmd.indexOf(value) === 0) {
                    CMD.value = cmd + " ";
                    break;
                }
            }
        } else {
            const tmp = value.replace(/\s+/, " ").split(" ");
            const cmd = tmp[0];
            const search = tmp[1];
            const found = [];
            for (let filename of LIST) {
                if (filename !== search && filename.indexOf(search) === 0) {
                    found.push(filename);
                }
            }
            if (found.length === 1) {
                CMD.value = [cmd, found[0]].join(" ");
            } else if (found.length > 1) {
                add_result(PATH + ">" + value, true);
                add_result(found.join("\n"), false);
            }
        }
    }

    function cmd_cache() {
        const size = CACHE.length;
        const tmp = CACHE.slice().reverse();
        for (let i = 0; i < size; i++) {
            if (i === NUM) {
                CMD.value = tmp[i];
                break;
            }
        }
    }

    function cmd_events() {
        if (!CMD) {
            return;
        }
        
        CMD.addEventListener("keydown", function (event) {
            if (is_enter(event)) {

                on_enter.call(this, event);

            } else if (is_escape(event)) {

                on_escape.call(this, event);

            } else if (is_arrow_down(event)) {

                on_arrow_down.call(this, event);

            } else if (is_arrow_up(event)) {

                on_arrow_up.call(this, event);

            } else if (is_tab(event)) {

                on_tab.call(this, event);
            }
        });

        [].forEach.call(document.querySelectorAll("*"), function(el) {
            el.addEventListener("click", function(event) {

                stop_propagation(event);
                cmd_focus();
            })
        });
    }

    function stop_propagation(event) {
        if (typeof event.stopPropagation === "function") {
            event.stopPropagation();
        } else {
            event.cancelBubble = true;
        }
    }

    function is_enter(event) {
        return event.key === "Enter" || event.code === "NumpadEnter" || event.code === "Enter";
    }

    function is_escape(event) {
        return event.key === "Escape" || event.code === "Escape";
    }

    function is_arrow_down(event) {
        return event.key === "ArrowDown" || event.code === "ArrowDown";
    }

    function is_arrow_up(event) {
        return event.key === "ArrowUp" || event.code === "ArrowUp";
    }

    function is_tab(event) {
        return event.key === "Tab" || event.code === "Tab";
    }

    function send_cmd(value) {

        CMD.disabled = true;
        const fd = new FormData();
        fd.append("cmd", value);

        fetch("ajax.php?do=send_cmd", {
            method: "POST",
            headers: {
                "Accept": "application/json; charset=utf-8",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams(fd).toString()
        }).then(function(response) {
            return response.ok ? response.json() : Promise.reject(response);
        }).then(function (data) {
            CMD.disabled = false;
            cmd_focus();
            add_result( PATH + ">" + value, true);
            const response = new Response(data);
            if (response.isOk()) {
                add_result(data.result, false);
                LIST = data.list;
            } else {
                add_result(response.getText());
            }
            to_bottom();
        }).catch(function(reason) {
            console.warn(reason);
        });
    }

    function clear_result() {
        const result = document.querySelector("#result");
        if (!result) {
            return;
        }

        result.textContent = "";
    }

    function add_result(value, is_cmd) {
        const result = document.querySelector("#result");
        if (!result) {
            return;
        }

        if (!value) {
            return;
        }

        const el = document.createElement("div");
        el.className = is_cmd ? "r-cmd" : "r-output";
        el.innerHTML = value.replace(/\n/g, "<br>").replace(/\s/g, "&nbsp;");
        result.appendChild(el);
    }
    
    document.addEventListener("DOMContentLoaded", function() {

        CMD = document.querySelector("#cmd");

        get_path();
        cmd_events();
        cmd_empty();
        cmd_focus();
    });
})(window, document);