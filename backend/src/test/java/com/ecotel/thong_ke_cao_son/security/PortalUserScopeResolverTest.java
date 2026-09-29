package com.ecotel.thong_ke_cao_son.security;

import com.ecotel.thong_ke_cao_son.repository.UserRepository;
import com.ecotel.thong_ke_cao_son.repository.UserScopeView;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * {@code PortalUserScopeResolver} — tra phạm vi đơn vị của user Portal từ bảng
 * users cục bộ. Trọng tâm: fail-closed (không tìm thấy/khoá/rỗng -> NONE) và
 * cache TTL ngắn (filter chạy mọi request, không được truy vấn DB mỗi lần).
 */
class PortalUserScopeResolverTest {

    private static final Duration TTL = Duration.ofSeconds(60);

    /** Đồng hồ chỉnh tay được để test hết hạn cache mà không phải ngủ thật. */
    private static final class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-09-28T00:00:00Z");

        void advance(Duration d) {
            now = now.plus(d);
        }

        @Override public java.time.ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }

    private final UserRepository repo = mock(UserRepository.class);
    private final MutableClock clock = new MutableClock();
    private final PortalUserScopeResolver resolver = new PortalUserScopeResolver(repo, clock, TTL);

    private static UserScopeView view(Long departmentId, Boolean fullDataScope) {
        return new UserScopeView() {
            @Override public Long getDepartmentId() { return departmentId; }
            @Override public Boolean getFullDataScope() { return fullDataScope; }
        };
    }

    @Test
    @DisplayName("user tồn tại -> trả đúng phòng ban + fullDataScope")
    void foundUserReturnsScope() {
        when(repo.findScopeByUsername("nv01")).thenReturn(Optional.of(view(7L, true)));

        assertThat(resolver.resolve("nv01")).isEqualTo(new PortalUserScopeResolver.Scope(7L, true));
    }

    @Test
    @DisplayName("user không tồn tại / bị khoá (repo rỗng) -> NONE, fail-closed")
    void unknownOrInactiveUserIsNone() {
        when(repo.findScopeByUsername("ghost")).thenReturn(Optional.empty());

        assertThat(resolver.resolve("ghost")).isEqualTo(PortalUserScopeResolver.Scope.NONE);
    }

    @Test
    @DisplayName("user chưa gán phòng ban (LEFT JOIN ra null) -> departmentId null, fullDataScope false, KHÔNG NPE")
    void userWithoutDepartmentIsNotFullScope() {
        when(repo.findScopeByUsername("nv02")).thenReturn(Optional.of(view(null, null)));

        PortalUserScopeResolver.Scope scope = resolver.resolve("nv02");

        assertThat(scope.departmentId()).isNull();
        assertThat(scope.fullDataScope()).isFalse();
    }

    @Test
    @DisplayName("username null/rỗng/khoảng trắng -> NONE và KHÔNG chạm DB")
    void blankUsernameNeverQueries() {
        assertThat(resolver.resolve(null)).isEqualTo(PortalUserScopeResolver.Scope.NONE);
        assertThat(resolver.resolve("")).isEqualTo(PortalUserScopeResolver.Scope.NONE);
        assertThat(resolver.resolve("   ")).isEqualTo(PortalUserScopeResolver.Scope.NONE);

        verify(repo, never()).findScopeByUsername(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("gọi lại trong TTL -> dùng cache, chỉ 1 truy vấn DB")
    void secondCallWithinTtlHitsCache() {
        when(repo.findScopeByUsername("nv01")).thenReturn(Optional.of(view(7L, false)));

        resolver.resolve("nv01");
        clock.advance(TTL.minusSeconds(1));
        resolver.resolve("nv01");

        verify(repo, times(1)).findScopeByUsername("nv01");
    }

    @Test
    @DisplayName("hết TTL -> tra lại DB, thấy thay đổi phòng ban / khoá tài khoản")
    void expiredEntryIsRefreshed() {
        when(repo.findScopeByUsername("nv01"))
                .thenReturn(Optional.of(view(7L, true)))
                .thenReturn(Optional.empty()); // sau đó bị khoá

        assertThat(resolver.resolve("nv01").fullDataScope()).isTrue();

        clock.advance(TTL.plusSeconds(1));

        assertThat(resolver.resolve("nv01")).isEqualTo(PortalUserScopeResolver.Scope.NONE);
        verify(repo, times(2)).findScopeByUsername("nv01");
    }

    @Test
    @DisplayName("kết quả NONE cũng được cache (dò username lạ liên tục không đập DB mỗi request)")
    void negativeResultsAreCachedToo() {
        when(repo.findScopeByUsername("ghost")).thenReturn(Optional.empty());

        resolver.resolve("ghost");
        resolver.resolve("ghost");

        verify(repo, times(1)).findScopeByUsername("ghost");
    }
}
