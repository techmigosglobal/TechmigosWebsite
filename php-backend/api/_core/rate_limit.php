<?php

declare(strict_types=1);

function maybe_cleanup_rate_limits(PDO $pdo): void
{
    $cfg = app_config()['rate_limit'];
    $probability = max((int) $cfg['cleanup_probability'], 0);

    if ($probability > 0 && random_int(1, $probability) === 1) {
        $threshold = time() - ((int) $cfg['window_seconds'] * 4);
        $stmt = $pdo->prepare('DELETE FROM rate_limit_counters WHERE window_start < :threshold');
        $stmt->execute(['threshold' => $threshold]);
    }
}

function rate_limit_check(string $bucketKey, int $limit): array
{
    $pdo = db();
    $cfg = app_config()['rate_limit'];
    $windowSeconds = (int) $cfg['window_seconds'];
    $windowStart = (int) (floor(time() / $windowSeconds) * $windowSeconds);

    maybe_cleanup_rate_limits($pdo);

    try {
        $pdo->beginTransaction();

        $nowExpression = db_now_expression();
        if (db_driver() === 'sqlite') {
            $insertSql =
                'INSERT INTO rate_limit_counters (bucket_key, window_start, count, updated_at)
                 VALUES (:bucket_key, :window_start, 1, ' . $nowExpression . ')
                 ON CONFLICT(bucket_key, window_start)
                 DO UPDATE SET count = count + 1, updated_at = ' . $nowExpression;
        } else {
            $insertSql =
                'INSERT INTO rate_limit_counters (bucket_key, window_start, count, updated_at)
                 VALUES (:bucket_key, :window_start, 1, ' . $nowExpression . ')
                 ON DUPLICATE KEY UPDATE count = count + 1, updated_at = ' . $nowExpression;
        }

        $insert = $pdo->prepare($insertSql);
        $insert->execute([
            'bucket_key' => $bucketKey,
            'window_start' => $windowStart,
        ]);

        $selectSql =
            'SELECT count FROM rate_limit_counters WHERE bucket_key = :bucket_key AND window_start = :window_start';
        if (db_driver() !== 'sqlite') {
            $selectSql .= ' FOR UPDATE';
        }

        $select = $pdo->prepare($selectSql);
        $select->execute([
            'bucket_key' => $bucketKey,
            'window_start' => $windowStart,
        ]);

        $count = (int) ($select->fetchColumn() ?: 0);
        $pdo->commit();

        if ($count > $limit) {
            return ['allowed' => false, 'remaining' => 0];
        }

        return ['allowed' => true, 'remaining' => max($limit - $count, 0)];
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        json_error('Could not process request right now.', 500);
    }
}
