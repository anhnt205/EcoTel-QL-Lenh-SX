package com.ecotel.thong_ke_cao_son.permission;

import com.ecotel.thong_ke_cao_son.enums.PermissionAction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermissionDto {
    private boolean c; // create
    private boolean r; // read
    private boolean u; // update
    private boolean d; // delete
    private boolean a; // approve

    // Không có quyền nào cả
    public boolean hasNoPermission() {
        return !c && !r && !u && !d && !a;
    }
    public boolean has(PermissionAction action) {
        return switch (action) {
            case C -> c;
            case R -> r;
            case U -> u;
            case D -> d;
            case A -> a;
        };
    }
}
