<?php

declare(strict_types=1);

function as_string(mixed $value): string
{
    if (!is_string($value)) {
        return '';
    }

    return trim($value);
}

function is_valid_email(string $value): bool
{
    return (bool) filter_var($value, FILTER_VALIDATE_EMAIL);
}
