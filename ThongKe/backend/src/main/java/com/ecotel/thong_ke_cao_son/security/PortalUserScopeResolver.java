package com.ecotel.thong_ke_cao_son.security;

import com.ecotel.thong_ke_cao_son.repository.UserRepository;
import com.ecotel.thong_ke_cao_son.repository.UserScopeView;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Bổ sung phạm vi dữ liệu theo đơn vị cho token PORTAL.
 *
 * <p>Token app do Portal phát hành chỉ mang {@code username}, {@code fullName},
 * {@code companyId}, {@code app}, {@code permissions} (xem
 * {@code JwtService.generateAppToken} của PORTAL-PM) — KHÔNG có
 * {@code departmentId}/{@code fullDataScope}. User Portal chính là user của
 * app (chủ dự án xác nhận 2026-09-28), nên tra phạm vi từ bảng {@code users}
 * cục bộ theo {@code username} (unique).
 *
 * <p><b>Fail-closed:</b> không tìm thấy, bị khoá, hay username rỗng -> {@link
 * Scope#NONE} (không phòng ban, không xem toàn bộ) — tức KHÔNG thấy dữ liệu đã
 * gắn đơn vị nào, đúng ngữ nghĩa cũ của {@code AppTokenFilter}.
 *
 * <p>Cache trong bộ nhớ, TTL ngắn: filter này chạy MỌI request, không thể
 * thêm 1 truy vấn DB cho mỗi lần. Đổi phòng ban/khoá tài khoản có hiệu lực
 * tối đa sau {@link #DEFAULT_TTL}.
 */
@Component
public class PortalUserScopeResolver {

    static final Duration DEFAULT_TTL = Duration.ofSeconds(60);
    /** Chặn cache phình vô hạn nếu bị dò username lạ liên tục. */
    private static final int MAX_ENTRIES = 20_000;

    public record Scope(Long departmentId, boolean fullDataScope) {
        public static final Scope NONE = new Scope(null, false);
    }

    private record Entry(Scope scope, Instant expiresAt) {}

    private final UserRepository userRepository;
    private final Clock clock;
    private final Duration ttl;
    private final ConcurrentHashMap<String, Entry> cache = new ConcurrentHashMap<>();

    @Autowired
    public PortalUserScopeResolver(UserRepository userRepository) {
        this(userRepository, Clock.systemUTC(), DEFAULT_TTL);
    }

    PortalUserScopeResolver(UserRepository userRepository, Clock clock, Duration ttl) {
        this.userRepository = userRepository;
        this.clock = clock;
        this.ttl = ttl;
    }

    public Scope resolve(String username) {
        if (username == null || username.isBlank()) {
            return Scope.NONE;
        }
        Instant now = clock.instant();
        Entry cached = cache.get(username);
        if (cached != null && now.isBefore(cached.expiresAt())) {
            return cached.scope();
        }

        Scope scope = userRepository.findScopeByUsername(username)
                .map(PortalUserScopeResolver::toScope)
                .orElse(Scope.NONE);

        if (cache.size() >= MAX_ENTRIES) {
            cache.clear();
        }
        cache.put(username, new Entry(scope, now.plus(ttl)));
        return scope;
    }

    private static Scope toScope(UserScopeView view) {
        return new Scope(view.getDepartmentId(), Boolean.TRUE.equals(view.getFullDataScope()));
    }
}
