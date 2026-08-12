package com.ecotel.thong_ke_cao_son.enums;

import lombok.Getter;

@Getter
public enum PermissionAction {
    C("c"), R("r"), U("u"), D("d"), A("a");

    private final String key;
    PermissionAction(String key) { this.key = key; }
}
