package com.ecotel.thong_ke_cao_son.security;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class OtcStore {

    private final StringRedisTemplate redisTemplate;
    private static final String PREFIX = "otc:";

    public record OtcEntry(String appToken, String refreshToken) {}

    // Atomic getAndDelete để tránh race condition
    public Optional<OtcEntry> consume(String code) {
        String key = PREFIX + code;

        // Dùng cách đơn giản và atomic: getAndDelete (Spring Data Redis 2.6+)
        String value = redisTemplate.opsForValue().getAndDelete(key);
        if (value == null) return Optional.empty();

        String[] parts = value.split("\\|", 2);
        if (parts.length != 2) return Optional.empty();

        return Optional.of(new OtcEntry(parts[0], parts[1]));
    }
}

