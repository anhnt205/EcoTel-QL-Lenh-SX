package com.ecotel.thong_ke_cao_son.config;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class JwtConverterConfig implements Converter<Jwt, AbstractAuthenticationToken> {

    private static final String PERMISSIONS_CLAIM = "permissions"; // key trong JWT payload từ Portal
    private static final String USER_ID_CLAIM     = "userId";
    private static final String USERNAME_CLAIM    = "username";

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Collection<GrantedAuthority> authorities = extractAuthorities(jwt);
        return new JwtAuthenticationToken(jwt, authorities, extractPrincipalName(jwt));
    }

    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        List<String> permissions = jwt.getClaimAsStringList(PERMISSIONS_CLAIM);
        if (permissions == null || permissions.isEmpty()) {
            return Collections.emptyList();
        }
        return permissions.stream()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
    }

    private String extractPrincipalName(Jwt jwt) {
        String username = jwt.getClaimAsString(USERNAME_CLAIM);
        return username != null ? username : jwt.getSubject();
    }
}

