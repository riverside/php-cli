<?php
class cli
{
    public static function is_bsd()
    {
        return PHP_OS_FAMILY == 'BSD';
    }

    public static function is_darwin()
    {
        return PHP_OS_FAMILY == 'Darwin';
    }

    public static function is_linux()
    {
        return PHP_OS_FAMILY == 'Linux';
    }

    public static function is_solaris()
    {
        return PHP_OS_FAMILY == 'Solaris';
    }

    public static function is_unknown()
    {
        return PHP_OS_FAMILY == 'Unknown';
    }

    public static function is_win()
    {
        return PHP_OS_FAMILY == 'Windows';
    }

    public static function is_disabled($func_name)
    {
        $list = explode(',', ini_get('disable_functions'));
        $list = array_map('trim', $list);

        return in_array($func_name, $list);
    }

    public static function json($data, $exit=true)
    {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data);
        if ($exit)
        {
            exit;
        }
    }
}