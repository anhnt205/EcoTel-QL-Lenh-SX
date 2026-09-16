package com.ecotel.thong_ke_cao_son.security;

import com.ecotel.thong_ke_cao_son.annotation.PublicApi;
import com.ecotel.thong_ke_cao_son.annotation.RequirePermission;
import com.ecotel.thong_ke_cao_son.controller.ReconciliationController;
import com.ecotel.thong_ke_cao_son.permission.PermissionDto;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerExecutionChain;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PermissionFilterTest {
    final RequestMappingHandlerMapping mapping = mock(RequestMappingHandlerMapping.class);
    final PermissionFilter filter = new PermissionFilter(mapping);
    final MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/reconciliation/decisions");
    final MockHttpServletResponse response = new MockHttpServletResponse();
    final FilterChain chain = mock(FilterChain.class);

    @AfterEach void clearContext() { SecurityContextHolder.clearContext(); }

    void authenticate(boolean approve) {
        AppUserDetails user = AppUserDetails.builder().permissions(Map.of("reconciliation",
                PermissionDto.builder().c(true).a(approve).build())).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }

    void handler(String name) throws Exception {
        when(mapping.getHandler(request)).thenReturn(new HandlerExecutionChain(
                new HandlerMethod(new Endpoints(), Endpoints.class.getMethod(name))));
    }

    @Test void downstreamExceptionNeverExecutesRequestTwice() throws Exception {
        authenticate(true);
        handler("approve");
        ServletException failure = new ServletException("downstream failure");
        doThrow(failure).when(chain).doFilter(request, response);
        assertSame(failure, assertThrows(ServletException.class, () -> filter.doFilter(request, response, chain)));
        verify(chain, times(1)).doFilter(request, response);
    }

    @Test void publicEndpointExceptionAlsoPropagatesOnce() throws Exception {
        handler("publicEndpoint");
        doThrow(new ServletException("failure")).when(chain).doFilter(request, response);
        assertThrows(ServletException.class, () -> filter.doFilter(request, response, chain));
        verify(chain, times(1)).doFilter(request, response);
    }

    @Test void handlerResolutionFailureDoesNotBypassAuthorization() throws Exception {
        when(mapping.getHandler(request)).thenThrow(new IllegalStateException("cannot resolve"));
        assertThrows(ServletException.class, () -> filter.doFilter(request, response, chain));
        verifyNoInteractions(chain);
    }

    @Test void createPermissionDoesNotAllowApproval() throws Exception {
        authenticate(false);
        handler("approve");
        filter.doFilter(request, response, chain);
        assertEquals(403, response.getStatus());
        verifyNoInteractions(chain);
    }

    @Test void approvePermissionAllowsOneExecution() throws Exception {
        authenticate(true);
        handler("approve");
        filter.doFilter(request, response, chain);
        verify(chain, times(1)).doFilter(request, response);
    }

    @Test void noAuthenticatedAppUserDetailsIsRejected() throws Exception {
        // Không gọi authenticate(...) -> SecurityContextHolder rỗng, đúng
        // trạng thái khi AppTokenFilter từ chối dựng AppUserDetails (vd
        // refresh token gửi thẳng làm Bearer, Quality Gate lượt 7 của
        // Codex — xem AppTokenFilterTest.AccessVsRefreshToken).
        handler("approve");
        filter.doFilter(request, response, chain);
        assertEquals(401, response.getStatus());
        verifyNoInteractions(chain);
    }

    @Test void unconfiguredHandlerIsDenied() throws Exception {
        handler("unconfigured");
        filter.doFilter(request, response, chain);
        assertEquals(403, response.getStatus());
        verifyNoInteractions(chain);
    }

    @Test void actualDecisionEndpointsRequireApproval() {
        for (var method : ReconciliationController.class.getDeclaredMethods()) {
            if (method.getName().equals("saveDecision") || method.getName().equals("saveDecisions")) {
                RequirePermission policy = method.getAnnotation(RequirePermission.class);
                assertNotNull(policy);
                assertEquals("reconciliation", policy.resource());
                assertEquals("a", policy.action());
            }
        }
    }

    static class Endpoints {
        @RequirePermission(resource = "reconciliation", action = "a")
        public void approve() {}
        @PublicApi public void publicEndpoint() {}
        public void unconfigured() {}
    }
}
